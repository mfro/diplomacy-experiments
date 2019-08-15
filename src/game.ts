export enum RegionType {
    LAND,
    WATER,
}

export class Region<T = any> {
    readonly attached = new Set<Region>();
    readonly adjacent = new Set<Region>();

    constructor(
        readonly data: T,
        readonly type: RegionType
    ) { }

    get allAdjacent() {
        let list = [...this.adjacent];
        for (let node of this.attached) {
            list.push(...node.adjacent);
        }
        return list;
    }

    get isShore() {
        return this.type == RegionType.LAND && [...this.adjacent].find(a => a.type == RegionType.WATER);
    }
}

export enum UnitType {
    Army,
    Fleet,
}

export class Unit {
    constructor(
        readonly region: Region,
        readonly type: UnitType,
        readonly team: string,
    ) { }
}

export class GameMap {
    constructor(
        readonly regions: Region[],
    ) { }
}

export class GameState {
    readonly units = new Set<Unit>();

    constructor(
        readonly map: GameMap,
        readonly teams: string[],
    ) { }
}

class OrderBase {
    constructor(
        readonly unit: Unit
    ) { }
}

class HoldOrder extends OrderBase {
    readonly support: SupportOrder[] = [];
    constructor(unit: Unit) {
        super(unit);
    }
}

class MoveOrder extends OrderBase {
    readonly support: SupportOrder[] = [];
    readonly convoys: ConvoyOrder[][] = [];
    constructor(
        unit: Unit,
        readonly target: Region
    ) {
        super(unit);
    }
}

class SupportOrder extends OrderBase {
    constructor(
        unit: Unit,
        readonly target: MoveOrder | HoldOrder
    ) {
        super(unit);

        target.support.push(this);
    }
}

class ConvoyOrder extends OrderBase {
    constructor(
        unit: Unit,
        readonly target: MoveOrder
    ) {
        super(unit);
    }
}

type AnyOrder = HoldOrder | MoveOrder | SupportOrder | ConvoyOrder;

function resolve(game: GameState, orders: AnyOrder[]) {
    function isDisrupted(support: SupportOrder) {
        for (let attack of orders) {
            if (!(attack instanceof MoveOrder) || attack.target != support.unit.region)
                continue;

            if (support.target instanceof MoveOrder && support.target.target == attack.unit.region)
                continue;

            if (support.unit.team == attack.unit.team)
                continue;

            return true;
        }

        return false;
    }

    for (let order of orders) {
        if (order instanceof SupportOrder && isDisrupted(order)) {
            order.target.support.splice(order.target.support.indexOf(order), 1);
        }
    }

    function bestAttacker(region: Region) {
        let entering = orders.filter(o => o instanceof MoveOrder && o.target == region) as MoveOrder[];
        if (entering.length == 0)
            return null;

        let best: MoveOrder[] = [];
        let strength = 0;

        for (let move of entering) {
            if (move.support.length > strength) {
                best = [move];
                strength = move.support.length;
            } else if (move.support.length == strength) {
                best.push(move);
            }
        }

        if (best.length != 1)
            return null;

        return best[0];
    }

    function isEvicted(order: SupportOrder | ConvoyOrder) {
        let attacker = bestAttacker(order.unit.region);
        return attacker != null &&
            attacker.unit.team != order.unit.team &&
            attacker.support.find(s => s.unit.team != order.unit.team) != null;
    }

    for (let order of orders) {
        if (order instanceof SupportOrder && isEvicted(order)) {
            order.target.support.splice(order.target.support.indexOf(order), 1);
        }
    }

    let faceoffs = [];
    for (let left of orders) {
        if (!(left instanceof MoveOrder))
            continue;

        for (let right of orders) {
            if (!(right instanceof MoveOrder))
                continue;

            if (right.target != left.unit.region ||
                left.target != right.unit.region)
                continue;

            faceoffs.push({ left, right });
            break;
        }
    }

    for (let faceoff of faceoffs) {
        let lost;
        if (faceoff.left.support > faceoff.right.support)
            lost = [faceoff.right];
        else if (faceoff.left.support < faceoff.right.support)
            lost = [faceoff.left];
        else
            continue;

        for (let order of lost) {
            orders.splice(orders.indexOf(order), 1);
            orders.push(new HoldOrder(order.unit));

            for (let support of order.support) {
                orders.splice(orders.indexOf(support), 1);
                orders.push(new HoldOrder(support.unit));
            }
        }
    }

    let possible: MoveOrder[] = [];
    for (let region of game.map.regions) {
        let best = bestAttacker(region);
        if (best == null)
            continue;

        possible.push(best);
    }

    let evicted: Unit[] = [];
    function resolve(move: MoveOrder, stack: MoveOrder[]) {
        if (move == stack[0]) {
            if (stack.length > 2)
                return true;
            if (stack.find(o => o.convoys.length))
                return true;
            return false;
        }

        let current = orders.find(o => o.unit.region == move.target);
        if (current == null)
            return true;

        if (current instanceof MoveOrder) {
            stack.push(move);
            let empty = resolve(current, stack);
            stack.pop();
            if (empty) return true;
        }

        if (current.unit.team == move.unit.team)
            return false;

        let defenders: SupportOrder[];
        if (current instanceof HoldOrder)
            defenders = current.support;
        else
            defenders = [];

        let attackers = move.support.filter(o => o.unit.team != current!.unit.team);
        if (attackers.length <= defenders.length)
            return false;

        if (stack.length == 0)
            evicted.push(current.unit);
        return true;
    }

    let resolved: MoveOrder[] = [];
    for (let move of possible) {
        if (resolve(move, [])) {
            resolved.push(move);
        }
    }

    return resolved;
}
