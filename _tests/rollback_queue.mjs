import assert, {strictEqual} from 'assert'
import RollbackQueue from '../managers/RollbackQueue.mjs'


describe('RollbackQueue', function () {
  describe('add_state', function () {
    it('should record latest input state', function () {
      RollbackQueue.reset_everything()
      let frame_no = 0
      RollbackQueue.add_state(frame_no,{
        attack:false,
        defend:false,
      })
      let prediction = RollbackQueue.read_present_predicted_state()
      strictEqual(prediction.attack,false)
      strictEqual(prediction.defend,false)
    });
  });
  describe('read_predicted_state', function () {
    it('should return the most recent state for the given frame number', function () {
      RollbackQueue.reset_everything()
      let frame_no_a = 0
      let frame_no_b = 10
      let frame_no_c = 20
      let predicted_frame = 15
      
      RollbackQueue.add_state(frame_no_a,{
        attack:false,
        defend:false,
      })
      RollbackQueue.add_state(frame_no_b,{
        attack:true,
        defend:true,
      })
      RollbackQueue.add_state(frame_no_c,{
        attack:true,
        defend:false,
      })
      let prediction = RollbackQueue.read_predicted_state(predicted_frame)
      strictEqual(prediction.attack,true)
      strictEqual(prediction.defend,true)
    });
  });
  describe('advance_present_frame', function () {
    it('should cause read_present_predicted_state to return newer state', function () {
      RollbackQueue.reset_everything()
      let frame_no_a = 0
      let frame_no_b = 1
      let frame_no_c = 2
      
      RollbackQueue.add_state(frame_no_a,{
        attack:false,
        defend:false,
      })
      RollbackQueue.add_state(frame_no_b,{
        attack:true,
        defend:true,
      })
      RollbackQueue.add_state(frame_no_c,{
        attack:true,
        defend:false,
      })
      let prediction = RollbackQueue.read_present_predicted_state()
      strictEqual(prediction.attack,false)
      strictEqual(prediction.defend,false)
      RollbackQueue.advance_present_frame()
    });
  });
});