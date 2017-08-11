# Canvas-Piano-Keys
Canvas element based piano keyboard input for mobile and desktop. See example below.
```html
<script>
let synth = {
	onMidi(msg) {
		let midiNumber = msg.num;
		let messageType = msg.type;//"on" or "off"
		if(messageType === "on") {
			this.playNote(midiNumber);
		} else if(messageType === "off") {
			this.stopNote(midiNumber);
		}
	}
	playNote(midiNumber) {
		//start note with given number
	},
	stopNote(midiNumber) {
		//stop note with given number
	}
};
	
let kb = new Keyboard({
	container: document.body,
	octave: -1,
	listener: msg => synth.onMidi(msg)
});
</script>
```
