const mod = {
    name:"math",
    dependencies:[],
    description:"all your math needs"
}

mod.activate = async function(engine,world){
}

mod.random_integer = function(min, max) {
    const minCeiled = Math.ceil(min);
    const maxFloored = Math.floor(max);
    return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled); // The maximum is exclusive and the minimum is inclusive
}

mod.random_float = function(min, max) {
    return Math.random() * (max - min) + min; // The maximum is exclusive and the minimum is inclusive
}

export {mod}