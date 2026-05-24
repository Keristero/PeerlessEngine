// Identifies an entity as belonging to a managed pool.
// Present on the entity for its entire lifetime (active or pooled).
//
//   pool_id : integer key into engine.mods.pool._pools
const PoolMember = { pool_id: [] }

export { PoolMember }
