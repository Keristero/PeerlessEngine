import { setup_component_ownership } from './component_ownership.mjs'
import { setup_topological_sort }  from './topological_sort.mjs'
import { setup_system_manager }    from './system_manager.mjs'
import { setup_mod_loader_core }   from './mod_loader.mjs'

// Attach all engine capabilities in dependency order:
//   ownership guards must exist before system_manager calls _install_write_guards,
//   topological_sort must exist before system_manager calls sort_systems,
//   activate_mod must exist before find_and_load_mods calls it.
export function setup_mod_loader(engine) {
    setup_component_ownership(engine)
    setup_topological_sort(engine)
    setup_system_manager(engine)
    setup_mod_loader_core(engine)
}
