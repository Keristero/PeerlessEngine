export function point_rectangle_overlap(rect_x, rect_y, rect_w, rect_h, mouse_x, mouse_y) {
    // Check if the mouse cursor is within the rectangle boundaries
    return rect_x <= mouse_x && mouse_x < rect_x + rect_w && rect_y <= mouse_y && mouse_y < rect_y + rect_h;
}