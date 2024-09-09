import { ResourceMints, ResourceMintsRaw } from '../types/types';
import { parsePublicKey } from './parsePublicKey';

// Funzione per convertire un piano nel tipo corretto
export const parseResourceMints = (
  resourceMints: ResourceMintsRaw,
): ResourceMints => {
  return {
    silica: parsePublicKey(resourceMints.silica),
    nitrogen: parsePublicKey(resourceMints.nitrogen),
    titanium_ore: parsePublicKey(resourceMints.titanium_ore),
    titanium: parsePublicKey(resourceMints.titanium),
    aerogel: parsePublicKey(resourceMints.aerogel),
    field_stabilizer: parsePublicKey(resourceMints.field_stabilizer),
    lumanite: parsePublicKey(resourceMints.lumanite),
    power_source: parsePublicKey(resourceMints.power_source),
    electromagnet: parsePublicKey(resourceMints.electromagnet),
    hydrogen: parsePublicKey(resourceMints.hydrogen),
    copper: parsePublicKey(resourceMints.copper),
    biomass: parsePublicKey(resourceMints.biomass),
    iron_ore: parsePublicKey(resourceMints.iron_ore),
    graphene: parsePublicKey(resourceMints.graphene),
    super_conductor: parsePublicKey(resourceMints.super_conductor),
    strange_emitter: parsePublicKey(resourceMints.strange_emitter),
    carbon: parsePublicKey(resourceMints.carbon),
    iron: parsePublicKey(resourceMints.iron),
    copper_ore: parsePublicKey(resourceMints.copper_ore),
    particle_accelerator: parsePublicKey(resourceMints.particle_accelerator),
    survey_data_unit: parsePublicKey(resourceMints.survey_data_unit),
    diamond: parsePublicKey(resourceMints.diamond),
    hydrocarbon: parsePublicKey(resourceMints.hydrocarbon),
    radiation_absorber: parsePublicKey(resourceMints.radiation_absorber),
    energy_substrate: parsePublicKey(resourceMints.energy_substrate),
    framework: parsePublicKey(resourceMints.framework),
    copper_wire: parsePublicKey(resourceMints.copper_wire),
    polymer: parsePublicKey(resourceMints.polymer),
    electronics: parsePublicKey(resourceMints.electronics),
    magnet: parsePublicKey(resourceMints.magnet),
    crystal_lattice: parsePublicKey(resourceMints.crystal_lattice),
    steel: parsePublicKey(resourceMints.steel),
    arco: parsePublicKey(resourceMints.arco),
    rochinol: parsePublicKey(resourceMints.rochinol),
    fuel: parsePublicKey(resourceMints.fuel),
    food: parsePublicKey(resourceMints.food),
    toolkit: parsePublicKey(resourceMints.toolkit),
    ammunition: parsePublicKey(resourceMints.ammunition),
  };
};
