import assert, {strictEqual} from 'assert'
import EventManager from '../managers/EventManager.mjs'


describe('EventManager', function () {
  describe('fire + on', function () {
    it('should trigger any on callbacks set up on the listener', function () {
      let calls_a = 0
      let calls_b = 0
      let generic_listener_a = EventManager.on((event)=>{
        calls_a++
      })
      let generic_listener_b = EventManager.on((event)=>{
        calls_b++
      })
      EventManager.fire()
      strictEqual(1, calls_a);
      strictEqual(1, calls_b);
    });
  });
  describe('nested listeners', function () {
    it('listener b should trigger because it is a child of listener a', function () {
      let calls_a = 0
      let calls_b = 0
      let generic_listener_a = EventManager.on((event)=>{
        calls_a++
        return true
      })
      let generic_listener_b = generic_listener_a.on((event)=>{
        calls_b++
      })
      EventManager.fire()
      strictEqual(1, calls_a);
      strictEqual(1, calls_b);
    });
    it('listener b should NOT trigger, because listener a returned false', function () {
      let calls_a = 0
      let calls_b = 0
      let generic_listener_a = EventManager.on((event)=>{
        calls_a++
        return false
      })
      let generic_listener_b = generic_listener_a.on((event)=>{
        calls_b++
      })
      EventManager.fire()
      strictEqual(1, calls_a);
      strictEqual(0, calls_b);
    });
  });
});