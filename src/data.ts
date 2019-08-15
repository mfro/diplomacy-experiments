import finalData from './data/data.json';
import { Region, RegionType } from './game';
import { Path } from './path';

interface RegionData {
    name: string,
    area: Path,
}

let regions: Region<RegionData>[] = [];

for (let info of finalData.territories) {
    let region = new Region<RegionData>({
        name: info.name,
        area: Path.parse(info.area),
    }, info.type);

    regions.push(region);

    for (let index of info.adjacent) {
        let other = regions[index];
        if (other == null) continue;
        region.adjacent.add(other);
        other.adjacent.add(region);
    }
}

export const allRegions = [...regions.values()];
export const deadzones = finalData.deadzones.map(z => Path.parse(z));
