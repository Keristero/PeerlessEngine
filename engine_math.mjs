export const radians_between_vector2ds = function(x_a,y_a,x_b,y_b){
    // Calculate the differences in x and y coordinates
    const xDifference = x_b - x_a;
    const yDifference = y_b - y_a;

    // Calculate the angle in radians
    const angleInRadians = Math.atan2(yDifference, xDifference);

    return angleInRadians;
}

export const direction_vector_from_radians = function(radians){
    // Calculate the differences in x and y coordinates
    var x = Math.cos(radians);
    var y = Math.sin(radians);
    return {x: x, y: y};
}