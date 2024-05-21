This is designed to be used as a static webpage, no external dependencies are required.

1. you can install mocha to run the unit tests


## Managers

#### Event Manager
the event manager is a form of event listener, if you call fire on it - all of it's listeners (created with .on) will run their callbacks, if the callbacks return true - they too will fire their callbacks.