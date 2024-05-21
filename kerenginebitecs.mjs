//This file allows me to add extra behavour to bitecs functions

// Import all components from the library
import * as StandardModule from './libraries/bitecs.mjs'

export function defineComponent(object) {
    console.log('defineComponent, hahahahaha',object)
    return StandardModule.defineComponent(object)
}

// Re-export all components
export * from './libraries/bitecs.mjs'