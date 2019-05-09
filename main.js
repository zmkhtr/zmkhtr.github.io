//import library
import {KNNImageClassifier} from 'deeplearn-knn-image-classifier';
import * as dl from 'deeplearn';


// Ukuran gambar webcame
const IMAGE_SIZE = 227;
// K value untuk algoritma KNN
const TOPK = 10;

const predictionThreshold = 0.98

var words = ["Saya berkata : ", "Halo", "lain-lain"]
// var words = ["Saya berkata : ", "hello", "what is", "the weather", "the time",
//"add","eggs","to the list","five","feet","in meters","tell me","a joke", "bye", "lain-lain"]


// words from above array which act as terminal words in a sentence
var endWords = ["Halo"]

class LaunchModal {
  constructor(){
    this.modalWindow = document.getElementById('launchModal')

    this.closeBtn = document.getElementById('close-modal')

    this.closeBtn.addEventListener('click', (e) => {
      this.modalWindow.style.display = "none"
    })

    window.addEventListener('click', (e) => {
      if(e.target == this.modalWindow){
        this.modalWindow.style.display = "none"
      }
    })

    this.modalWindow.style.display = "block"
    this.modalWindow.style.zIndex = 500
  }
}


class Main {
  constructor(){
    // Initiate variables
    this.infoTexts = [];
    this.training = -1; // -1 when no class is being trained
    this.videoPlaying = false;

    this.previousPrediction = -1
    this.currentPredictedWords = []

    // variables to restrict prediction rate
    this.now;
    this.then = Date.now()
    this.startTime = this.then;
    this.fps = 5; //framerate - number of prediction per second
    this.fpsInterval = 1000/(this.fps); 
    this.elapsed = 0;

    this.trainingListDiv = document.getElementById("training-list")
    this.exampleListDiv = document.getElementById("example-list")
    
    this.knn = null

    this.textLine = document.getElementById("text")
  
    // Get video element that will contain the webcam image
    this.video = document.getElementById('video');

    this.addWordForm = document.getElementById("add-word")

    this.statusText = document.getElementById("status-text")

    this.video.addEventListener('mousedown', () => {
      // click on video to go back to training buttons
      main.pausePredicting();
      this.trainingListDiv.style.display = "block"
    })

    // add word to training example set
    this.addWordForm.addEventListener('submit', (e) => {
      e.preventDefault();
      let word = document.getElementById("new-word").value.trim().toLowerCase();
      let checkbox = document.getElementById("is-terminal-word")

      if(word && !words.includes(word)){
        //console.log(word)
        words.splice(words.length-1,0,word) //insert at penultimate index in array
        this.createButtonList(false)
        this.updateExampleCount()
        //console.log(words)
        

        if(checkbox.checked){
          endWords.push(word)
        }

        document.getElementById("new-word").value = ''
        checkbox.checked = false;

        // console.log(words)
        // console.log(endWords)

      } else {
        alert("Kata sudah ditambahkan atau tidak ada kata yang diinput !")
      }

      return
    })

    // show modal window
    let modal = new LaunchModal()

    this.updateExampleCount()

    document.getElementById("status").style.display = "none"

    this.createTrainingBtn()
    
    this.createButtonList(false)
    
    // load text to speech
    this.tts = new TextToSpeech()

  }

  createPredictBtn(){
    var div = document.getElementById("action-btn")
    div.innerHTML = ""
    const predButton = document.createElement('button')

    predButton.innerText = "Start Predicting >>>"
    div.appendChild(predButton);

    predButton.addEventListener('mousedown', () => {
      console.log("start predicting")
      const exampleCount = this.knn.getClassExampleCount()

      // check if training has been done
      if(Math.max(...exampleCount) > 0){

        // if wake word has not been trained
        if(exampleCount[0] == 0){
          alert(
            `Kamu belum menambahkan dataset untuk 'Saya berkata :' `
            )
          return
        }

        // if the catchall phrase lain-lain hasnt been trained
        if(exampleCount[words.length-1] == 0){
          alert(
            `Kamu belum menambahkan dataset untuk 'lain-lain.'\n\nTambahkan foto kamu dalam posisi diam, \n\nIni untuk mencegah kekeliruan saat menerjemahkan bahasa isyarat`)
          return
        }

        // check if atleast one terminal word has been trained
        if(!this.areTerminalWordsTrained(exampleCount)){
          alert(
            `Tambahkan dataset paling tidak pada 1 kata akhiran.\n\nKata akhiran digunakan untuk mengakhiri kalimat, kata akhiran kamu adalah : ${endWords}`
            )
          return
        }

        this.trainingListDiv.style.display = "none"
        this.textLine.classList.remove("intro-steps")
        this.textLine.innerText = "Peragakan bahasa isyaratnya"
        this.startPredicting()
      } else {
        alert(
          `Kamu belum menambahkan dataset.\n\nKlik dan tahan "Add Example" button pada setiap kata sambil meperagakan bahasa isyarat yang mewakili kata tersebut didepan webcam.`
          )
      }
    })
  }

  createTrainingBtn(){
    var div = document.getElementById("action-btn")
    div.innerHTML = ""

    const trainButton = document.createElement('button')
    trainButton.innerText = "Training >>>"
    div.appendChild(trainButton);


    trainButton.addEventListener('mousedown', () => {

      // check if user has added atleast one terminal word
      if(words.length > 3 && endWords.length == 1){
        console.log('Belum ada kata akhiran yang di tambahkan')
        alert(`Kamu belum menambahkan kata akhiran.\n\n Kata akhiran adalah kata yang akan terdapat pada akhir kalimat \n Contoh : Jika kamu ingin menanyakan "Siapa disana?" , 'disana' adalah kata akhiran. "lain-lain" bukan kata akhiran.`)
        return
      }

      if(words.length == 3 && endWords.length ==1){
        var proceed = confirm("Kamu belum menambahkan kata apapun.\n\nKamu hanya bisa menggunakan kata 'Saya berkata : , halo'")

        if(!proceed) return
      }

      this.startWebcam()

      console.log("ready to train")
      this.createButtonList(true)
      this.addWordForm.innerHTML = ''
      let p = document.createElement('p')
      p.innerText = `Klik dan tahan "Add Example" button pada setiap kata sambil meperagakan bahasa isyarat yang mewakili kata tersebut didepan webcam. Tambahkan paling tidak 30 dataset !

      untuk lain-lain, Foto diri kamu dalam posisi diam(idle) dan tangan kebawah`
      this.addWordForm.appendChild(p)
      
      this.loadKNN()

      this.createPredictBtn()

      this.textLine.innerText = "Tambahkan dataset"

      let subtext = document.createElement('span')
      subtext.innerHTML = "<br/>Saatnya menambahkan gerakan bahasa isyarat sesuai kata yang sudah kamu tambahkan" 
      subtext.classList.add('subtext')
      this.textLine.appendChild(subtext)

    })
  }

  areTerminalWordsTrained(exampleCount){

    var totalTerminalWordsTrained = 0

    for(var i=0;i<words.length;i++){
      if(endWords.includes(words[i])){
        if(exampleCount[i] > 0){
          totalTerminalWordsTrained+=1
        }
      }
    }

    return totalTerminalWordsTrained
  }

  startWebcam(){
    // Setup webcam
    navigator.mediaDevices.getUserMedia({video: {facingMode: 'user'}, audio: false})
    .then((stream) => {
      this.video.srcObject = stream;
      this.video.width = IMAGE_SIZE;
      this.video.height = IMAGE_SIZE;

      this.video.addEventListener('playing', ()=> this.videoPlaying = true);
      this.video.addEventListener('paused', ()=> this.videoPlaying = false);
    })
  }

  loadKNN(){

    this.knn = new KNNImageClassifier(words.length, TOPK);

    // Load knn model
    this.knn.load()
    .then(() => this.startTraining()); 
  }

  updateExampleCount(){
    var p = document.getElementById('count')
    p.innerText = `Training: ${words.length} words`
  }

  createButtonList(showBtn){
    //showBtn - true: show training btns, false:show only text

    // Clear List
    this.exampleListDiv.innerHTML = ""

    // Create training buttons and info texts    
    for(let i=0;i<words.length; i++){
      this.createButton(i, showBtn)
    }
  }

  createButton(i, showBtn){
    const div = document.createElement('div');
    this.exampleListDiv.appendChild(div);
    div.style.marginBottom = '10px';
    
    // Create Word Text
    const wordText = document.createElement('span')

    if(i==0 && !showBtn){
      wordText.innerText = words[i].toUpperCase()+" (kata untuk memulai) "
    } else if(i==words.length-1 && !showBtn){
      wordText.innerText = words[i].toUpperCase()+" (lainnya) "
    } else {
      wordText.innerText = words[i].toUpperCase()+" "
      wordText.style.fontWeight = "bold"
    }
    
    
    div.appendChild(wordText);

    if(showBtn){
      // Create training button
      const button = document.createElement('button')
      button.innerText = "Add Example"//"Train " + words[i].toUpperCase()
      div.appendChild(button);

      // Listen for mouse events when clicking the button
      button.addEventListener('mousedown', () => this.training = i);
      button.addEventListener('mouseup', () => this.training = -1);

      // Create clear button to emove training examples
      const btn = document.createElement('button')
      btn.innerText = "Clear"//`Clear ${words[i].toUpperCase()}`
      div.appendChild(btn);

      btn.addEventListener('mousedown', () => {
        console.log("clear training data for this label")
        this.knn.clearClass(i)
        this.infoTexts[i].innerText = " 0 examples"
      })
      
      // Create info text
      const infoText = document.createElement('span')
      infoText.innerText = " 0 examples";
      div.appendChild(infoText);
      this.infoTexts.push(infoText);
    }
  }
  
  startTraining(){
    if (this.timer) {
      this.stopTraining();
    }
    var promise = this.video.play();

    if(promise !== undefined){
      promise.then(_ => {
        console.log("Autoplay started")
      }).catch(error => {
        console.log("Autoplay prevented")
      })
    }
    this.timer = requestAnimationFrame(this.train.bind(this));
  }
  
  stopTraining(){
    this.video.pause();
    cancelAnimationFrame(this.timer);
  }
  
  train(){
    if(this.videoPlaying){
      // Get image data from video element
      const image = dl.fromPixels(this.video);
      
      // Train class if one of the buttons is held down
      if(this.training != -1){
        // Add current image to classifier
        this.knn.addImage(image, this.training)
      }

      const exampleCount = this.knn.getClassExampleCount()

      if(Math.max(...exampleCount) > 0){
        for(let i=0;i<words.length;i++){
          if(exampleCount[i] > 0){
            this.infoTexts[i].innerText = ` ${exampleCount[i]} examples`
          }
        }
      }
    }
    this.timer = requestAnimationFrame(this.train.bind(this));
  }

  startPredicting(){
    // stop training
    if(this.timer){
      this.stopTraining();
    }

    document.getElementById("status").style.background = "deepskyblue"
    this.setStatusText("Status: Ready!")

    this.video.play();

    this.pred = requestAnimationFrame(this.predict.bind(this))
  }

  pausePredicting(){
    console.log("pause predicting")
    this.setStatusText("Status: Paused Predicting")
    cancelAnimationFrame(this.pred)
  }

  predict(){
    this.now = Date.now()
    this.elapsed = this.now - this.then

    if(this.elapsed > this.fpsInterval){

      this.then = this.now - (this.elapsed % this.fpsInterval)

      if(this.videoPlaying){
        const exampleCount = this.knn.getClassExampleCount();

        const image = dl.fromPixels(this.video);

        if(Math.max(...exampleCount) > 0){
          this.knn.predictClass(image)
          .then((res) => {
            for(let i=0;i<words.length;i++){

              // if matches & is above threshold & isnt same as prev prediction
              // and is not the last class which is a catch all class
              if(res.classIndex == i 
                && res.confidences[i] > predictionThreshold 
                && res.classIndex != this.previousPrediction
                && res.classIndex != words.length-1){

                this.tts.speak(words[i])

                // set previous prediction so it doesnt get called again
                this.previousPrediction = res.classIndex;


              }
            }
          })
          .then(() => image.dispose())
        } else {
          image.dispose()
        }
      }
    }

    this.pred = requestAnimationFrame(this.predict.bind(this))
  }

  setStatusText(status){
    document.getElementById("status").style.display = "block"
    this.statusText.innerText = status
  }

}

class TextToSpeech{
  constructor(){
    this.synth = window.speechSynthesis
    this.voices = []
    this.pitch = 1.0
    this.rate = 0.9

    this.textLine = document.getElementById("text")
    this.ansText = document.getElementById("answerText")
    this.loader = document.getElementById("loader")

    this.selectedVoice = 48 // this is Google-US en. Can set voice and language of choice

    this.currentPredictedWords = []
    this.waitTimeForQuery = 5000


    this.synth.onvoiceschanged = () => {
      this.populateVoiceList()
    }
    
  }

  populateVoiceList(){
    if(typeof speechSynthesis === 'undefined'){
      console.log("no synth")
      return
    }
    this.voices = this.synth.getVoices()

    if(this.voices.indexOf(this.selectedVoice) > 0){
      console.log(`${this.voices[this.selectedVoice].name}:${this.voices[this.selectedVoice].lang}`)
    } else {
      //alert("Selected voice for speech did not load or does not exist.\nCheck Internet Connection")
    }
    
  }

  clearPara(queryDetected){
    this.textLine.innerText = '';
    this.ansText.innerText = ''
    if(queryDetected){
      this.loader.style.display = "block"
    } else {
      this.loader.style.display = "none"
      this.ansText.innerText = "Tidak ada bahasa isyarat terdeteksi"
      main.previousPrediction = -1
    }
    this.currentPredictedWords = []
  }

  speak(word){

    if(word == 'Saya berkata : '){
      console.log("clear para")
      this.clearPara(true);

      setTimeout(() => {
        // if no query detected after Saya berkata :  is signed
        if(this.currentPredictedWords.length == 1){
          this.clearPara(false)
        }
      }, this.waitTimeForQuery)
    } 

    if(word != 'Saya berkata : ' && this.currentPredictedWords.length == 0){
      console.log("Kata pertama harus 'Saya berkata :' ")
      console.log(word)
      return
    }

    // if(endWords.includes(word) && this.currentPredictedWords.length == 1 && (word != "hello" && word != "bye")){
    //   console.log("end word detected early")
    //   console.log(word)
    //   return;
    // }

    if(this.currentPredictedWords.includes(word)){
      // prevent word from being detected repeatedly in phrase
      console.log("kata sudah ada pada kalimat tersebut")
      return
    }


    this.currentPredictedWords.push(word)


    this.textLine.innerText += ' ' + word;


    var utterThis = new SpeechSynthesisUtterance(word)

    utterThis.onend = (evt) => {
      if(endWords.includes(word)){
         //if last word is one of end words start listening for transcribing
        console.log("this was the last word")

        // main.setStatusText("Status: Waiting for Response")

        console.log("clear para")
        this.clearPara(true);
        // let stt = new SpeechToText()
      }
    }

    utterThis.onerror = (evt) => {
      console.log("Error speaking")
    }

    utterThis.voice = this.voices[this.selectedVoice]

    utterThis.pitch = this.pitch
    utterThis.rate = this.rate

    this.synth.speak(utterThis)

  }


}

// class SpeechToText{
//   constructor(){
//     this.interimTextLine = document.getElementById("interimText")
//     this.textLine = document.getElementById("answerText")
//     this.loader = document.getElementById("loader")
//     this.finalTranscript = ''
//     this.recognizing = false

//     this.recognition = new webkitSpeechRecognition();

//     this.recognition.continuous = true;
//     this.recognition.interimResults = true;

//     this.recognition.lang = 'en-US'

//     this.cutOffTime = 15000 // cut off speech to text after

//     this.recognition.onstart = () => {
//       this.recognizing = true;
//       console.log("started recognizing")
//       main.setStatusText("Status: Transcribing")
//     }

//     this.recognition.onerror = (evt) => {
//       console.log(evt + " recogn error")
//     }

//     this.recognition.onend = () => {
//       console.log("stopped recognizing")
//       if(this.finalTranscript.length == 0){
//         this.type("No response detected")

//       }
//       this.recognizing = false;

//       main.setStatusText("Status: Finished Transcribing")
//       // restart prediction after a pause
//       setTimeout(() => {
//         main.startPredicting()
//       }, 1000)
//     }

//     this.recognition.onresult = (event) => {
//       var interim_transcript = ''
//       if(typeof(event.results) == 'undefined'){
//         return;
//       }
   

//       for (var i = event.resultIndex; i < event.results.length; ++i) {
//         if (event.results[i].isFinal) {
//           this.finalTranscript += event.results[i][0].transcript;
//         } else {
//           interim_transcript += event.results[i][0].transcript;
//         }
//       }


//       this.interimType(interim_transcript)
//       this.type(this.finalTranscript)
//     }

//     setTimeout(()=>{
//       this.startListening();
//     },0)
    

//     setTimeout(()=>{
//       this.stopListening()
//     },this.cutOffTime)
//   }

//   startListening(){
//     if(this.recognizing){
//       this.recognition.stop()
//       return
//     }

//     console.log("listening")

//     main.pausePredicting()

//     this.recognition.start()
//   }

//   stopListening(){
//     console.log("STOP LISTENING")
//     if(this.recognizing){
//       console.log("stop speech to text")
//       this.recognition.stop()

//       //restart predicting
//       main.startPredicting()
//       return
//     }
//   }

//   interimType(text){
//     this.loader.style.display = "none"
//     this.interimTextLine.innerText = text
//   }

//   type(text){
//     this.loader.style.display = "none"
//     this.textLine.innerText = text;
//   }
// }

var main = null;

window.addEventListener('load', () => {

  var ua = navigator.userAgent.toLowerCase()

  if(!(ua.indexOf("chrome") != -1 || ua.indexOf("firefox")!= -1)){
    alert("Please visit in the latest Chrome or Firefox")
    return
  } 


  main = new Main()

});

