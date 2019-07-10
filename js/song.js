  window.onload =
    function() {
    var r = confirm("Wanna play song?");
    // var audio = new Audio('imperialrap.mp3');
    if (r == true) {
        // audio.play();
        document.getElementById('song').play();
    } else {
        // audio.stop();
        document.getElementById('song').stop();
    }
}