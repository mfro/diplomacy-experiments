import jsx from './tsx';

import { Vec } from './vec';
import { Region, RegionType } from './game';
import { allRegions, deadzones } from './data';

let bbox = [
    new Vec(557.6677246, 16.4444447),
    new Vec(1709.666626, 981.4444447),
];
let svg = <svg viewBox={`0 0 ${bbox[1].x - bbox[0].x} ${bbox[1].y - bbox[0].y}`}></svg>;
let container = <div class="container">
    {svg}
</div>;
document.body.append(container);

function run_canvas() {
    let canvas = <canvas width={window.innerWidth} height={window.innerHeight}></canvas> as HTMLCanvasElement;
    let context = canvas.getContext('2d')!;

    let hover: Region | undefined;

    let states = new Map<Region, { path: Path2D, active: boolean, adjacent: boolean }>();
    let deadPaths = deadzones.map(p => p.toPath2D());

    for (let t of allRegions) {
        states.set(t, {
            path: t.data.area.toPath2D(),
            active: true,
            adjacent: true,
        });
    }

    function render() {
        let land = allRegions.filter(a => a.type == RegionType.LAND);
        let water = allRegions.filter(a => a.type == RegionType.WATER);

        context.strokeStyle = '1px black';
        for (let t of water) {
            let state = states.get(t)!;
            let adjacent = hover && hover.adjacent.has(t);
            if (state.adjacent == adjacent) continue;

            state.adjacent = !!adjacent;

            if (adjacent) {
                context.fillStyle = '#388e3c';
            } else {
                context.fillStyle = '#5C6BC0';
            }

            let path = state.path;
            context.fill(path);
            context.stroke(path);
            console.log('x');
        }

        context.strokeStyle = '0.8px black';
        for (let t of land) {
            let state = states.get(t)!;
            let adjacent = hover && hover.adjacent.has(t);
            if (state.adjacent == adjacent) continue;

            state.adjacent = !!adjacent;

            if (adjacent) {
                context.fillStyle = '#388e3c';
            } else {
                context.fillStyle = '#98674c';
            }

            let path = state.path;
            context.fill(path);
            context.stroke(path);
            console.log('y');
        }

        context.fillStyle = 'white';
        context.strokeStyle = '1px black';
        for (let path of deadPaths) {
            context.fill(path);
            context.stroke(path);
        }

        requestAnimationFrame(render);
    }

    canvas.addEventListener('mousemove', e => {
        let node = allRegions.find(t => context.isPointInPath(states.get(t)!.path, e.offsetX, e.offsetY));
        if (node == hover) return;

        hover = node;
        // render();
        // if (node == null) return;

        // for (let pair of rendered) {
        //     pair[1].classList.toggle('active', pair[0] == node[0]);
        //     pair[1].classList.toggle('adjacent', node[0].adjacent.has(pair[0]));
        // }

        // // node[1].parentNode!.append(node[1]);
        // console.log(node[0].name);
    });

    render();
    document.body.append(canvas);
}

function run_svg() {
    let regions = allRegions.slice();

    let rendered = new Map<Region, Element>();
    let landTerritories = <g class="country land"></g>;
    let waterTerritories = <g class="country water"></g>;

    for (let t of regions) {
        let g = <g></g>;
        rendered.set(t, g as any);

        if (t.type == 0)
            landTerritories.append(g);
        else
            waterTerritories.append(g);

        g.append(<path d={t.data.area.toString()} />);
    }

    let gLandmass = <g class="landmass"></g>;
    for (let t of regions) {
        if (t.type == 0) {
            gLandmass.append(<path d={t.data.area.toString()} />);
        }
    }

    let gDeadzone = <g class="deadzones" />
    for (let path of deadzones) {
        gDeadzone.append(<path d={path.toString()} />);
    }

    svg.append(waterTerritories, gLandmass, landTerritories, gDeadzone);

    document.body.addEventListener('mousedown', e => {
        let node = [...rendered].find(a => a[1].contains(e.target as any));
        if (node == null) return;

        for (let pair of rendered) {
            pair[1].classList.toggle('active', pair[0] == node[0]);
            pair[1].classList.toggle('adjacent', node[0].adjacent.has(pair[0]));
        }
    });

    svg.append(<filter id="landmass-shadow" height="130%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
        <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
        </feMerge>
    </filter>);
}

run_canvas();



// parse(container);

// let adjacencies = findAdjacents(paths.areas);


// loadData();
