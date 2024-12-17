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
      let frame_no_a = 1
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
  describe('add_state', function () {
    it('should rollback when a new current state is added', function () {
      RollbackQueue.reset_everything()
      //add a state for frame 1
      RollbackQueue.add_state(1,{
        attack:true,
        defend:true,
      })
      RollbackQueue.set_present_frame(2)
      //set frame to frame 2, state should be there as expected
      let prediction = RollbackQueue.read_present_predicted_state()
      strictEqual(prediction.attack,true)
      strictEqual(prediction.defend,true)

      //rewrite frame 2
      RollbackQueue.add_state(2,{
        attack:false,
        defend:false,
      })
      //we should see the new rolled back state
      prediction = RollbackQueue.read_present_predicted_state()
      strictEqual(prediction.attack,false)
      strictEqual(prediction.defend,false)
    });
    it('should rollback when a older state is added', function () {
      RollbackQueue.reset_everything()
      //add a state for frame 1
      RollbackQueue.add_state(1,{
        attack:true,
        defend:true,
      })
      RollbackQueue.set_present_frame(3)
      //set frame to frame 3, state should be there as expected
      let prediction = RollbackQueue.read_present_predicted_state()
      strictEqual(prediction.attack,true)
      strictEqual(prediction.defend,true)

      //rewrite frame 2
      RollbackQueue.add_state(2,{
        attack:false,
        defend:false,
      })
      //we should see the new rolled back state
      prediction = RollbackQueue.read_present_predicted_state()
      strictEqual(prediction.attack,false)
      strictEqual(prediction.defend,false)
    });
  });
  describe('add_state', function () {
    it('should should allow complex states', function () {
      RollbackQueue.reset_everything()
      let frame_no = 0
      RollbackQueue.add_state(frame_no,{
        p1:{
          attack:false,
          defend:false,
        },
        p2:{
          attack:true,
          defend:false,
        }
      })
      let prediction = RollbackQueue.read_present_predicted_state()
      strictEqual(prediction.p1.attack,false)
      strictEqual(prediction.p2.attack,true)
    });
  });
});