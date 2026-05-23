// Generic collision response system.
// Iterates engine.mods.collision.active_collisions and applies the data-driven
// response components to the relevant entities.
//
// "Collider"  = the entity identified as the active/moving body (Circle + Velocity2d).
// "Collidee"  = the other entity in the pair.
//
// Response components handled:
//   Collider:  ColliderResponseSeparate, ColliderResponseBounce
//   Collidee:  CollideeResponseAngledBounce, CollideeResponseDestroy,
//              CollideeResponseVelocityTransfer

const system = {
    name: "collisionResponseSystem",
    category: "physics",
    dependencies: ["collisionSystem"],
    run: function (engine, world) {
        const { addComponent, hasComponent } = engine.bitecs
        const { Position2d, Velocity2d, Circle, Rectangle, Moved } = engine.mods.twodee.components
        const {
            ColliderResponseSeparate,
            ColliderResponseBounce,
            CollideeResponseDestroy,
            CollideeResponseVelocityTransfer,
            CollideeResponseAngledBounce,
            Destroyed,
        } = engine.mods.collision_response.components
        const { active_collisions } = engine.mods.collision

        for (const [a, b] of active_collisions) {
            // Identify which entity is the moving collider.
            let collider, collidee
            if (hasComponent(world, a, Circle) && hasComponent(world, a, Velocity2d)) {
                collider = a; collidee = b
            } else if (hasComponent(world, b, Circle) && hasComponent(world, b, Velocity2d)) {
                collider = b; collidee = a
            } else {
                continue
            }

            // ── ColliderResponseSeparate ─────────────────────────────────────
            // SAT push-out: move the collider out of any remaining overlap.
            if (hasComponent(world, collider, ColliderResponseSeparate) &&
                hasComponent(world, collidee, Rectangle)) {

                const cx = Position2d.x[collider], cy = Position2d.y[collider]
                const r  = Circle.radius[collider]
                const rx = Position2d.x[collidee], ry = Position2d.y[collidee]
                const rw = Rectangle.width[collidee], rh = Rectangle.height[collidee]

                const nearest_x = Math.max(rx, Math.min(cx, rx + rw))
                const nearest_y = Math.max(ry, Math.min(cy, ry + rh))
                const dx = cx - nearest_x
                const dy = cy - nearest_y
                const dist = Math.hypot(dx, dy)
                const penetration = r - dist

                if (penetration > 0) {
                    if (dist === 0) {
                        // Degenerate: ball centre exactly on the edge.
                        // Use last frame movement to determine the push direction.
                        const mdx = hasComponent(world, collider, Moved)
                            ? Moved.dx[collider] : Velocity2d.x[collider]
                        const mdy = hasComponent(world, collider, Moved)
                            ? Moved.dy[collider] : Velocity2d.y[collider]
                        if (Math.abs(mdx) >= Math.abs(mdy)) {
                            Position2d.x[collider] += mdx < 0 ? penetration : -penetration
                        } else {
                            Position2d.y[collider] += mdy < 0 ? penetration : -penetration
                        }
                    } else {
                        Position2d.x[collider] += (dx / dist) * penetration
                        Position2d.y[collider] += (dy / dist) * penetration
                    }
                }
            }

            // ── ColliderResponseBounce ───────────────────────────────────────
            if (hasComponent(world, collider, ColliderResponseBounce)) {
                const speed_factor = ColliderResponseBounce.speed_factor[collider] || 1
                const max_speed    = ColliderResponseBounce.max_speed[collider]    || 0

                if (hasComponent(world, collidee, CollideeResponseAngledBounce) &&
                    hasComponent(world, collidee, Rectangle)) {
                    // Paddle-style: x proportional to hit position, y always up.
                    const bat_x  = Position2d.x[collidee]
                    const bat_w  = Rectangle.width[collidee]
                    const spread = CollideeResponseAngledBounce.spread[collidee] || 4
                    Velocity2d.x[collider] = ((Position2d.x[collider] - (bat_x + bat_w / 2)) / (bat_w / 2)) * spread
                    Velocity2d.y[collider] = -Math.abs(Velocity2d.y[collider]) * speed_factor

                } else if (hasComponent(world, collidee, Rectangle)) {
                    // Standard axis reflection based on nearest point on the rect.
                    const cx = Position2d.x[collider], cy = Position2d.y[collider]
                    const rx = Position2d.x[collidee], ry = Position2d.y[collidee]
                    const rw = Rectangle.width[collidee], rh = Rectangle.height[collidee]
                    const nearest_x = Math.max(rx, Math.min(cx, rx + rw))
                    const nearest_y = Math.max(ry, Math.min(cy, ry + rh))
                    const dx = cx - nearest_x
                    const dy = cy - nearest_y

                    let bounce_on_x
                    if (dx === 0 && dy === 0) {
                        // Degenerate: use movement history to pick the flip axis.
                        const mdx = hasComponent(world, collider, Moved)
                            ? Moved.dx[collider] : Velocity2d.x[collider]
                        const mdy = hasComponent(world, collider, Moved)
                            ? Moved.dy[collider] : Velocity2d.y[collider]
                        bounce_on_x = Math.abs(mdx) >= Math.abs(mdy)
                    } else {
                        bounce_on_x = Math.abs(dx) >= Math.abs(dy)
                    }

                    if (bounce_on_x) {
                        Velocity2d.x[collider] = -Velocity2d.x[collider] * speed_factor
                    } else {
                        Velocity2d.y[collider] = -Velocity2d.y[collider] * speed_factor
                    }
                }

                if (max_speed > 0) {
                    const speed = Math.hypot(Velocity2d.x[collider], Velocity2d.y[collider])
                    if (speed > max_speed) {
                        const scale = max_speed / speed
                        Velocity2d.x[collider] *= scale
                        Velocity2d.y[collider] *= scale
                    }
                }
            }

            // ── CollideeResponseVelocityTransfer ─────────────────────────────
            if (hasComponent(world, collidee, CollideeResponseVelocityTransfer) &&
                hasComponent(world, collidee, Velocity2d)) {
                const amount = CollideeResponseVelocityTransfer.amount[collidee] || 0
                if (amount > 0) {
                    Velocity2d.x[collidee] += Velocity2d.x[collider] * amount
                    Velocity2d.y[collidee] += Velocity2d.y[collider] * amount
                }
            }

            // ── CollideeResponseDestroy ──────────────────────────────────────
            if (hasComponent(world, collidee, CollideeResponseDestroy)) {
                addComponent(world, collidee, Destroyed)
            }
        }
    }
}

export default system
