// size is the dimension of the object in x/y/z axis, with unit meter.

class ObjectCategory {
  constructor () {
    this.objTypeMap = {
      Car: { color: '#86af49', size: [4.5, 1.8, 1.5], attr: ['door open', 'trunk open'] },
      Pedestrian: { color: '#ff0000', size: [0.4, 0.5, 1.7], attr: ['umbrella', 'sitting', 'squating', 'bending over', 'luggage'] },
      Van: { color: '#00ff00', size: [4.5, 1.8, 1.5], attr: ['door open', 'trunk open'] },
      Bus: { color: '#ffff00', size: [13, 3, 3.5] },
      Truck: { color: '#00ffff', size: [10.0, 2.8, 3] },

      ScooterRider: { color: '#ff8800', size: [1.6, 0.6, 1.6], attr: ['umbrella', '1 passenger', '2 passengers', '3 passengers'] },
      Scooter: { color: '#aaaa00', size: [1.6, 0.6, 1.0] },

      BicycleRider: { color: '#88ff00', size: [1.6, 0.6, 1.7], attr: ['umbrella', '1 passenger', '2 passengers', '3 passengers'] },
      Bicycle: { color: '#ff8800', size: [1.6, 0.6, 1.2], attr: ['laying down'] },

      Motorcycle: { color: '#aaaa00', size: [1.6, 0.6, 1.2], attr: ['umbrella'] },
      MotorcycleRider: { color: '#ff8800', size: [1.6, 0.6, 1.6], attr: ['umbrella', '1 passenger', '2 passengers', '3 passengers'] },

      PoliceCar: { color: '#86af49', size: [4.5, 1.8, 1.5] },
      TourCar: { color: '#86af49', size: [4.4, 1.5, 2.2] },

      RoadWorker: { color: '#ff0000', size: [0.4, 0.5, 1.7] },
      Child: { color: '#ff0000', size: [0.4, 0.5, 1.2] },

      // Crowd:          {color: '#ff0000',  size:[1.6, 0.6, 1.2]},

      BabyCart: { color: '#ff0000', size: [0.8, 0.5, 1.0] },
      Cart: { color: '#ff0000', size: [0.8, 0.5, 1.0] },
      Cone: { color: '#ff0000', size: [0.3, 0.3, 0.6] },
      FireHydrant: { color: '#ff0000', size: [0.4, 0.4, 0.6] },
      SaftyTriangle: { color: '#ff0000', size: [0.3, 0.4, 0.4] },
      PlatformCart: { color: '#ff0000', size: [1.2, 0.8, 1.0] },
      ConstructionCart: { color: '#ff0000', size: [1.2, 0.8, 1.0] },
      RoadBarrel: { color: '#ff0000', size: [0.5, 0.5, 0.6] },
      TrafficBarrier: { color: '#ff0000', size: [1.5, 0.3, 1.2] },
      LongVehicle: { color: '#ff0000', size: [16, 3, 3] },

      BicycleGroup: { color: '#ff0000', size: [1.6, 0.6, 1.2] },

      ConcreteTruck: { color: '#00ffff', size: [10.0, 2.8, 3] },
      Tram: { color: '#00ffff', size: [10.0, 2.8, 3] },
      Excavator: { color: '#00ffff', size: [6.0, 3, 3] },

      Animal: { color: '#00aaff', size: [1.6, 0.6, 1.2] },

      TrashCan: { color: '#00aaff', size: [0.6, 0.4, 1.0] },

      ForkLift: { color: '#00aaff', size: [5.0, 1.2, 2.0] },
      Trimotorcycle: { color: '#00aaff', size: [2.6, 1.0, 1.6] },
      FreightTricycle: { color: '#00aaff', size: [2.6, 1.0, 1.6] },
      Crane: { color: '#00aaff', size: [5.0, 1.2, 2.0] },
      RoadRoller: { color: '#00aaff', size: [2.7, 1.5, 2.0] },
      Bulldozer: { color: '#00aaff', size: [3.0, 2.0, 2.0] },

      DontCare: { color: '#00ff88', size: [4, 4, 3] },
      Misc: { color: '#008888', size: [4.5, 1.8, 1.5] },
      Unknown: { color: '#008888', size: [4.5, 1.8, 1.5] },
      Unknown1: { color: '#008888', size: [4.5, 1.8, 1.5] },
      Unknown2: { color: '#008888', size: [4.5, 1.8, 1.5] },
      Unknown3: { color: '#008888', size: [4.5, 1.8, 1.5] },
      Unknown4: { color: '#008888', size: [4.5, 1.8, 1.5] },
      Unknown5: { color: '#008888', size: [4.5, 1.8, 1.5] }
    };

    this.popularCategories = ['Car', 'Pedestrian', 'Van', 'Bus', 'Truck', 'Scooter', 'ScooterRider', 'Bicycle', 'BicycleRider'];

    this.globalColorIdx = 0;
  }

  guessObjTypeByDimension (scale) {
    let maxScore = 0;
    let maxName = 0;
    this.popularCategories.forEach(i => {
      const o = this.objTypeMap[i];
      let scorex = o.size[0] / scale.x;
      let scorey = o.size[1] / scale.y;
      let scorez = o.size[2] / scale.z;

      if (scorex > 1) scorex = 1 / scorex;
      if (scorey > 1) scorey = 1 / scorey;
      if (scorez > 1) scorez = 1 / scorez;

      if (scorex + scorey + scorez > maxScore) {
        maxScore = scorex + scorey + scorez;
        maxName = i;
      }
    });

    console.log('guess type', maxName);
    return maxName;
  }

  getColorById (id) {
    let idx = parseInt(id);

    if (!idx) {
      idx = this.globalColorIdx;
      this.globalColorIdx += 1;
    }

    idx %= 33;
    idx = idx * 19 % 33;

    return {
      x: idx * 8 / 256.0,
      y: 1 - idx * 8 / 256.0,
      z: (idx < 16) ? (idx * 2 * 8 / 256.0) : ((32 - idx) * 2 * 8 / 256.0)
    };
  }

  getColorByType (category) {
    const targetColorHex = parseInt('0x' + this.getObjCfgByType(category).color.slice(1));

    return {
      x: (targetColorHex / 256 / 256) / 255.0,
      y: (targetColorHex / 256 % 256) / 255.0,
      z: (targetColorHex % 256) / 255.0
    };
  }

  getObjCfgByType (name) {
    if (this.objTypeMap[name]) {
      return this.objTypeMap[name];
    } else {
      return this.objTypeMap.Unknown;
    }
  }
}

const globalObjectCategory = new ObjectCategory();

export { globalObjectCategory };
