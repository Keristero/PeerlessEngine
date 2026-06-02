import { setup_topological_sort }  from './topological_sort.mjs'
import { setup_system_manager }    from './system_manager.mjs'
import { setup_mod_loader_core }   from './mod_loader.mjs'

export function setup_mod_loader(engine) {
    setup_topological_sort(engine)
    setup_system_manager(engine)
    setup_mod_loader_core(engine)
}
