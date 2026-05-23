// ── Collider components (placed on the moving / active entity) ───────────────

// Push the collider out of any overlap it entered this frame using the
// Separating Axis Theorem on the minimum-penetration axis.
// Requires the collider to also have a Circle component.
const ColliderResponseSeparate = {}

// Reflect the collider's velocity on the collision axis.
//   speed_factor : multiply speed after each bounce  (1.0 = unchanged)
//   max_speed    : hard cap on total speed post-bounce (0 = unlimited)
const ColliderResponseBounce = {
    speed_factor: [],
    max_speed: [],
}

// ── Collidee components (placed on the entity being hit) ─────────────────────

// The collidee is marked with Destroyed when struck by any collider.
const CollideeResponseDestroy = {}

// Adds a fraction of the collider's velocity to this entity's Velocity2d.
//   amount : fraction in [0..1]
const CollideeResponseVelocityTransfer = {
    amount: [],
}

// Paddle-style angled deflection: instead of a plain axis-reflection,
// the collider's x-velocity is set proportional to where on this surface it hit,
// and y is always reversed upward.
//   spread : max horizontal speed reached when hitting the very edge (e.g. 4)
const CollideeResponseAngledBounce = {
    spread: [],
}

// ── Lifecycle tag ─────────────────────────────────────────────────────────────

// Applied to an entity by ColliderResponseDestroy and removed by
// the destruction system which calls removeEntity().
const Destroyed = {}

export {
    ColliderResponseSeparate,
    ColliderResponseBounce,
    CollideeResponseDestroy,
    CollideeResponseVelocityTransfer,
    CollideeResponseAngledBounce,
    Destroyed,
}
