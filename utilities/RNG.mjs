class RNG{
    constructor(seed = Date.now()){
        //seed the random number generator here
        this.seed = seed;
    }
    int(min, max) {
        // Generate a random integer between min and max
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    float(min, max) {
        // Generate a random float between min and max
        return Math.random() * (max - min) + min;
    }

    from_array(array) {
        // Generate a random index from the array and return the element at that index
        const index = Math.floor(Math.random() * array.length);
        return array[index];
    }

    object_key(object) {
        // Generate a random key from the object and return the value associated with that key
        const keys = Object.keys(object);
        const index = Math.floor(Math.random() * keys.length);
        return object[keys[index]];
    }
}

export default new RNG()