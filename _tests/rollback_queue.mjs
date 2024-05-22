import assert, {strictEqual} from 'assert'
import RollbackQueue from '../managers/RollbackQueue.mjs'


describe('RollbackQueue', function () {
  describe('add_inputs', function () {
    it('should collect latest player inputs on the frame', function () {
      let frame_no = 1
      let player_id = "dave"
      
      RollbackQueue.add_inputs(frame_no,player_id,{
        w:true,
        a:true,
        s:true,
        d:true
      })

      RollbackQueue.add_inputs(frame_no,player_id,{
        s:false
      })

      let raw = RollbackQueue.read_raw_inputs(frame_no,player_id)
      strictEqual(raw.w,true)
      strictEqual(raw.s,false)
      strictEqual(raw.a,true)
      strictEqual(raw.d,true)
    });
    it('should remember past inputs to predict future ones', function () {
      let start_frame = -10
      let predicted_frame_no = 5
      let d_release_frame_no = 2
      let player_id = "dave"

      RollbackQueue.add_inputs(d_release_frame_no,player_id,{
        d:false
      })

      let predictions = RollbackQueue.predict_inputs(start_frame,predicted_frame_no)
      let raw = predictions[player_id]
      strictEqual(raw.w,true)
      strictEqual(raw.s,false)
      strictEqual(raw.a,true)
      strictEqual(raw.d,false)
    });
    it('keeps track of the latest predictions between frames', function () {
      RollbackQueue.reset()
      let starting_frame = 1
      let player_id = "dave"
      RollbackQueue.add_inputs(starting_frame,player_id,
      {
        attack:true,
        defend:false
      })
      for(let i = 0; i < 10; i++){
        RollbackQueue.advance_one_frame()
        let predictions = RollbackQueue.read_present_predictions()
        console.log(predictions)
        strictEqual(predictions[player_id].attack,true)
      }
    });
  });
});