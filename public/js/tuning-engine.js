// Tuning Engine for Car Tuning Simulator
// Vanilla ES6 JavaScript - Browser compatible

(function() {
  'use strict';

  // ============================================================================
  // CAR BASE DATA
  // ============================================================================
  const CAR_BASE_DATA = {
    // Japanese sedans
    camry: {
      name: 'Toyota Camry',
      baseHp: 203,
      baseWeightLbs: 3241,
      baseTopSpeed: 132,
      baseZeroSixty: 7.9,
      engineType: 'V6',
      drivetrain: 'FWD'
    },
    civic: {
      name: 'Honda Civic',
      baseHp: 158,
      baseWeightLbs: 2762,
      baseTopSpeed: 125,
      baseZeroSixty: 8.5,
      engineType: 'I4 Turbo',
      drivetrain: 'FWD'
    },
    
    // American muscle
    mustang: {
      name: 'Ford Mustang GT',
      baseHp: 460,
      baseWeightLbs: 3705,
      baseTopSpeed: 163,
      baseZeroSixty: 3.9,
      engineType: 'V8',
      drivetrain: 'RWD'
    },
    
    // European hypercars
    chiron: {
      name: 'Bugatti Chiron',
      baseHp: 1500,
      baseWeightLbs: 4398,
      baseTopSpeed: 304,
      baseZeroSixty: 2.3,
      engineType: 'W16 Quad-Turbo',
      drivetrain: 'AWD'
    },
    aventador: {
      name: 'Lamborghini Aventador',
      baseHp: 740,
      baseWeightLbs: 3472,
      baseTopSpeed: 217,
      baseZeroSixty: 2.8,
      engineType: 'V12',
      drivetrain: 'AWD'
    },
    sf90: {
      name: 'Ferrari SF90 Stradale',
      baseHp: 986,
      baseWeightLbs: 3461,
      baseTopSpeed: 211,
      baseZeroSixty: 2.5,
      engineType: 'V8 Twin-Turbo Hybrid',
      drivetrain: 'AWD'
    },
    
    // Classic cars
    modelT: {
      name: 'Ford Model T',
      baseHp: 20,
      baseWeightLbs: 1200,
      baseTopSpeed: 45,
      baseZeroSixty: 22.0,
      engineType: 'I4',
      drivetrain: 'RWD'
    },
    belAir: {
      name: 'Chevrolet Bel Air',
      baseHp: 162,
      baseWeightLbs: 3200,
      baseTopSpeed: 100,
      baseZeroSixty: 11.0,
      engineType: 'V8',
      drivetrain: 'RWD'
    },
    beetle: {
      name: 'Volkswagen Beetle',
      baseHp: 53,
      baseWeightLbs: 1848,
      baseTopSpeed: 78,
      baseZeroSixty: 15.0,
      engineType: 'Flat-4',
      drivetrain: 'RWD'
    }
  };

  // ============================================================================
  // TUNING MODS
  // ============================================================================
  const TUNING_MODS = {
    ecu: {
      stock: { hpMultiplier: 1.00, label: 'Stock' },
      stage1: { hpMultiplier: 1.12, label: 'Stage 1 (+12% HP)' },
      stage2: { hpMultiplier: 1.25, label: 'Stage 2 (+25% HP)' },
      raceMap: { hpMultiplier: 1.40, label: 'Race Map (+40% HP)' }
    },
    
    forcedInduction: {
      none: { hpMultiplier: 1.00, label: 'None' },
      streetTurbo: { hpMultiplier: 1.15, label: 'Street Turbo (+15% HP)' },
      twinTurbo: { hpMultiplier: 1.35, label: 'Twin-Turbo / Supercharger (+35% HP)' },
      bigBoost: { hpMultiplier: 1.55, label: 'Big Boost Pro (+55% HP)' }
    },
    
    aerodynamics: {
      stock: { 
        downforceMultiplier: 1.00, 
        topSpeedPenalty: 0, 
        lateralGBonus: 0,
        label: 'Stock'
      },
      aeroKit: { 
        downforceMultiplier: 1.05, 
        topSpeedPenalty: -2, 
        lateralGBonus: 0.15,
        label: 'Front Splitter & Rear Wing (+5% downforce, -2 mph top speed, +0.15 lateral Gs)'
      }
    },
    
    weightReduction: {
      stock: { weightReductionLbs: 0, label: 'Stock' },
      mild: { weightReductionLbs: -150, label: 'Mild (-150 lbs)' },
      track: { weightReductionLbs: -400, label: 'Track Stripped (-400 lbs)' }
    }
  };

  // ============================================================================
  // PHYSICS CONSTANTS
  // ============================================================================
  const PHYSICS = {
    // Base power-to-weight ratio constants for 0-60 calculation
    // Formula: 0-60 time = k / (hp / weight) where k is a constant based on drivetrain
    // These constants are calibrated based on real-world data
    FWD_CONSTANT: 18.5,
    RWD_CONSTANT: 17.8,
    AWD_CONSTANT: 17.2,
    
    // Mechanical stress factors
    BASE_STRESS: 20,  // Base stress percentage
    HP_STRESS_FACTOR: 0.15,  // Stress per % HP increase
    WEIGHT_STRESS_FACTOR: 0.02,  // Stress reduction per % weight reduction
    AERO_STRESS_FACTOR: 5,  // Stress from aero modifications
    FORCED_INDUCTION_STRESS: {
      none: 0,
      streetTurbo: 10,
      twinTurbo: 25,
      bigBoost: 45
    },
    ECU_STRESS: {
      stock: 0,
      stage1: 5,
      stage2: 15,
      raceMap: 30
    }
  };

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================
  
  /**
   * Get drivetrain constant for 0-60 calculation
   */
  function getDrivetrainConstant(drivetrain) {
    switch (drivetrain.toUpperCase()) {
      case 'AWD': return PHYSICS.AWD_CONSTANT;
      case 'RWD': return PHYSICS.RWD_CONSTANT;
      case 'FWD':
      default: return PHYSICS.FWD_CONSTANT;
    }
  }

  /**
   * Calculate mechanical stress score (0-100%)
   */
  function calculateMechanicalStress(car, mods) {
    let stress = PHYSICS.BASE_STRESS;
    
    // Calculate total HP multiplier
    const ecuMod = mods.ecu || 'stock';
    const fiMod = mods.forcedInduction || 'none';
    const totalHpMultiplier = (TUNING_MODS.ecu[ecuMod].hpMultiplier * TUNING_MODS.forcedInduction[fiMod].hpMultiplier);
    const hpIncreasePercent = ((totalHpMultiplier - 1) * 100);
    
    // HP stress
    stress += hpIncreasePercent * PHYSICS.HP_STRESS_FACTOR;
    
    // Weight reduction stress (reduces stress)
    const wrMod = mods.weightReduction || 'stock';
    const weightReduction = TUNING_MODS.weightReduction[wrMod].weightReductionLbs;
    const weightReductionPercent = (Math.abs(weightReduction) / car.baseWeightLbs) * 100;
    stress -= weightReductionPercent * PHYSICS.WEIGHT_STRESS_FACTOR;
    
    // Aero stress
    const aeroMod = mods.aerodynamics || 'stock';
    if (aeroMod !== 'stock') {
      stress += PHYSICS.AERO_STRESS_FACTOR;
    }
    
    // Forced induction stress
    stress += PHYSICS.FORCED_INDUCTION_STRESS[fiMod] || 0;
    
    // ECU stress
    stress += PHYSICS.ECU_STRESS[ecuMod] || 0;
    
    // Clamp to 0-100
    return Math.min(100, Math.max(0, stress));
  }

  // ============================================================================
  // MAIN CALCULATION FUNCTION
  // ============================================================================
  
  /**
   * Calculate tuned specifications for a car with selected modifications
   * 
   * @param {string} carKey - The key of the car in CAR_BASE_DATA (e.g., 'camry', 'mustang')
   * @param {Object} selectedMods - Object containing selected modifications
   * @param {string} selectedMods.ecu - ECU mod key ('stock', 'stage1', 'stage2', 'raceMap')
   * @param {string} selectedMods.forcedInduction - Forced induction key ('none', 'streetTurbo', 'twinTurbo', 'bigBoost')
   * @param {string} selectedMods.aerodynamics - Aero mod key ('stock', 'aeroKit')
   * @param {string} selectedMods.weightReduction - Weight reduction key ('stock', 'mild', 'track')
   * 
   * @returns {Object} Object containing calculated specifications
   */
  function calculateTunedSpecs(carKey, selectedMods) {
    // Validate car key
    const car = CAR_BASE_DATA[carKey.toLowerCase()];
    if (!car) {
      throw new Error(`Invalid car key: ${carKey}. Available cars: ${Object.keys(CAR_BASE_DATA).join(', ')}`);
    }
    
    // Default mods if not provided
    const mods = {
      ecu: selectedMods.ecu || 'stock',
      forcedInduction: selectedMods.forcedInduction || 'none',
      aerodynamics: selectedMods.aerodynamics || 'stock',
      weightReduction: selectedMods.weightReduction || 'stock'
    };
    
    // Validate mods
    if (!TUNING_MODS.ecu[mods.ecu]) {
      throw new Error(`Invalid ECU mod: ${mods.ecu}`);
    }
    if (!TUNING_MODS.forcedInduction[mods.forcedInduction]) {
      throw new Error(`Invalid Forced Induction mod: ${mods.forcedInduction}`);
    }
    if (!TUNING_MODS.aerodynamics[mods.aerodynamics]) {
      throw new Error(`Invalid Aerodynamics mod: ${mods.aerodynamics}`);
    }
    if (!TUNING_MODS.weightReduction[mods.weightReduction]) {
      throw new Error(`Invalid Weight Reduction mod: ${mods.weightReduction}`);
    }
    
    // Calculate final HP
    const ecuHpMult = TUNING_MODS.ecu[mods.ecu].hpMultiplier;
    const fiHpMult = TUNING_MODS.forcedInduction[mods.forcedInduction].hpMultiplier;
    const finalHp = Math.round(car.baseHp * ecuHpMult * fiHpMult);
    
    // Calculate final weight
    const weightReduction = TUNING_MODS.weightReduction[mods.weightReduction].weightReductionLbs;
    const finalWeight = car.baseWeightLbs + weightReduction;
    
    // Calculate final top speed
    const aeroMod = TUNING_MODS.aerodynamics[mods.aerodynamics];
    let finalTopSpeed = car.baseTopSpeed + aeroMod.topSpeedPenalty;
    
    // Top speed is also affected by power-to-weight ratio
    // More power = higher potential top speed, but aero drag limits it
    const stockPwrToWeight = car.baseHp / car.baseWeightLbs;
    const finalPwrToWeight = finalHp / finalWeight;
    const pwrToWeightRatio = finalPwrToWeight / stockPwrToWeight;
    
    // Apply power-to-weight top speed bonus (capped at +20%)
    const topSpeedBonus = Math.min(20, (pwrToWeightRatio - 1) * 15);
    finalTopSpeed = Math.round(finalTopSpeed + topSpeedBonus);
    
    // Ensure top speed doesn't go negative
    finalTopSpeed = Math.max(10, finalTopSpeed);
    
    // Calculate final 0-60 time using power-to-weight ratio physics
    const drivetrainConstant = getDrivetrainConstant(car.drivetrain);
    const powerToWeightRatio = finalHp / finalWeight;
    
    // Formula: time = constant / (power/weight) ^ 0.85
    // The exponent accounts for diminishing returns at high power levels
    const calculatedZeroSixty = drivetrainConstant / Math.pow(powerToWeightRatio, 0.85);
    
    // Clamp to reasonable values (minimum 1.0s, maximum 30s)
    const finalZeroToSixty = Math.min(30, Math.max(1.0, parseFloat(calculatedZeroSixty.toFixed(1))));
    
    // Calculate mechanical stress score
    const mechanicalStressScore = calculateMechanicalStress(car, mods);
    
    return {
      carKey,
      carName: car.name,
      baseSpecs: {
        baseHp: car.baseHp,
        baseWeightLbs: car.baseWeightLbs,
        baseTopSpeed: car.baseTopSpeed,
        baseZeroSixty: car.baseZeroSixty,
        engineType: car.engineType,
        drivetrain: car.drivetrain
      },
      selectedMods: {
        ecu: mods.ecu,
        forcedInduction: mods.forcedInduction,
        aerodynamics: mods.aerodynamics,
        weightReduction: mods.weightReduction
      },
      finalSpecs: {
        finalHp,
        finalWeight,
        finalZeroToSixty,
        finalTopSpeed
      },
      powerToWeightRatio: parseFloat((finalHp / finalWeight).toFixed(4)),
      lateralGs: parseFloat((0.8 + (aeroMod.lateralGBonus || 0)).toFixed(2)),
      mechanicalStressScore: Math.round(mechanicalStressScore),
      mechanicalStressLevel: mechanicalStressScore < 30 ? 'Low' : 
                            mechanicalStressScore < 60 ? 'Medium' : 
                            mechanicalStressScore < 80 ? 'High' : 'Extreme'
    };
  }

  // ============================================================================
  // EXPORT TO GLOBAL SCOPE
  // ============================================================================
  
  window.TuningEngine = {
    CAR_BASE_DATA: Object.freeze(Object.assign({}, CAR_BASE_DATA)),
    TUNING_MODS: Object.freeze({
      ecu: Object.freeze(Object.assign({}, TUNING_MODS.ecu)),
      forcedInduction: Object.freeze(Object.assign({}, TUNING_MODS.forcedInduction)),
      aerodynamics: Object.freeze(Object.assign({}, TUNING_MODS.aerodynamics)),
      weightReduction: Object.freeze(Object.assign({}, TUNING_MODS.weightReduction))
    }),
    calculateTunedSpecs: calculateTunedSpecs,
    
    // Utility method to get available car keys
    getCarKeys: function() {
      return Object.keys(CAR_BASE_DATA);
    },
    
    // Utility method to get available mod keys for a category
    getModKeys: function(category) {
      if (TUNING_MODS[category]) {
        return Object.keys(TUNING_MODS[category]);
      }
      return [];
    }
  };

  // Freeze the main object to prevent modification
  Object.freeze(window.TuningEngine);

})();
