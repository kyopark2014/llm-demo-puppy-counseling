const startButton = document.querySelector(".start-button");
const previewButton = document.querySelector(".preview-button");
// const downloadButton = document.querySelector(".download-button"); 
const emotionButton = document.querySelector(".emotion-button");
const playButton = document.querySelector(".play-button");

//event
startButton.addEventListener("click", videoStart);
// previewButton.addEventListener("click",preview);
emotionButton.addEventListener("click", emotion);
playButton.addEventListener("click", playSpeech);

let audio_file = "";

let profileInfo_emotion, profileInfo_age, profileInfo_features;
profileInfo_emotion = document.getElementById('profile-emotion');
profileInfo_age = document.getElementById('profile-age');
// profileInfo_features = document.getElementById('profile-features');
msgText = document.getElementById('message');

// const cloudfrntUrl = "https://d14j04tdmh4c1d.cloudfront.net/";

let previewlist = [];
let fileList = [];
const maxImgItems = 1;
let drawingIndex = 0;
// let uuid = uuidv4();
let emotionValue;
let generation;
let gender;

const previewPlayer = document.querySelector("#preview");
let canvas = document.getElementById('canvas');
canvas.width = previewPlayer.width;
canvas.height = previewPlayer.height;

function videoStart() {    
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(stream => {
            previewPlayer.srcObject = stream;

            console.log('video started!')
        })
}

function preview() {
    canvas.getContext('2d').drawImage(previewPlayer, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(function (blob) {
        const img = new Image();
        img.src = URL.createObjectURL(blob);

        console.log(blob);

        // downloadButton.href=img.src;
        // console.log(downloadButton.href);
        // downloadButton.download =`capture_${new Date()}.jpeg`; 
    }, 'image/png');
}

function emotion() {
    canvas.getContext('2d').drawImage(previewPlayer, 0, 0, canvas.width, canvas.height);
    drawingIndex = 0;

    console.log('event for emotion');

    getEmotion();
}

function getEmotion() {
    // const uri = cloudfrntUrl + "emotion";
    const uri = "emotion";
    const xhr = new XMLHttpRequest();

    xhr.open("POST", uri, true);

    xhr.onreadystatechange = () => {
        if (xhr.readyState === 4 && xhr.status === 200) {
            let response = JSON.parse(xhr.responseText);
            console.log("response: " + JSON.stringify(response));

            userId = response.id;
            console.log("userId: " + userId);

            gender = response.gender;
            console.log("gender: " + gender);

            generation = response.generation;
            console.log("generation: " + generation);

            let ageRangeLow = JSON.parse(response.ageRange.Low);
            let ageRangeHigh = JSON.parse(response.ageRange.High);
            let ageRange = `Age: ${ageRangeLow} ~ ${ageRangeHigh}`; // age   
            console.log('ages: ' + ageRange);

            let smile = response.smile;
            console.log("smile: " + smile);

            let eyeglasses = response.eyeglasses;
            console.log("eyeglasses: " + eyeglasses);

            let sunglasses = response.sunglasses;
            console.log("sunglasses: " + sunglasses);

            let beard = response.beard;
            console.log("beard: " + beard);

            let mustache = response.mustache;
            console.log("mustache: " + mustache);

            let eyesOpen = response.eyesOpen;
            console.log("eyesOpen: " + eyesOpen);

            let mouthOpen = response.mouthOpen;
            console.log("mouthOpen: " + mouthOpen);

            emotionValue = response.emotions.toLowerCase();
            console.log("emotion: " + emotionValue);

            let emotionText = "Emotion: ";
            if (emotionValue == "happy") emotionText += "행복";
            else if (emotionValue == "surprised") emotionText += "놀람";
            else if (emotionValue == "calm") emotionText += "평온";
            else if (emotionValue == "angry") emotionText += "화남";
            else if (emotionValue == "fear") emotionText += "공포";
            else if (emotionValue == "confused") emotionText += "혼란스러움";
            else if (emotionValue == "disgusted") emotionText += "역겨움";
            else if (emotionValue == "sad") emotionText += "슬픔";

            let features = "Features:";
            if (smile) features += ' 웃음';
            if (eyeglasses) features += ' 안경';
            if (sunglasses) features += ' 썬글라스'; 
            if (beard) features += ' 수염';
            if (mustache) features += ' 콧수염';
            if (eyesOpen) features += ' 눈뜨고있음';
            if (mouthOpen) features += ' 입열고있음';
            console.log("features: " + features);

            let genderText;
            if (gender == 'male') genderText = '남자'
            else genderText = '여자'
            let profileText = ageRange + ' (' + genderText + ')';
            console.log("profileText: " + profileText);

            profileInfo_emotion.innerHTML = `<h5>${emotionText}</h5>`
            profileInfo_age.innerHTML = `<h5>${profileText}</h5>`
            // profileInfo_features.innerHTML = `<h3>${features}</h3>`

            canvas.toBlob(function (blob) {
                const img = new Image();
                img.src = URL.createObjectURL(blob);

                console.log(blob);

                //    downloadButton.href = img.src;
                //    console.log(downloadButton.href);
                //    downloadButton.download = `capture_${emotionValue}_${gender}_${middleAge}_${new Date()}.jpeg`;
            }, 'image/png');

            console.log("emotion: ", emotionValue);

            getMessage();
        }
        else {
            profileInfo_emotion.innerHTML = `<h3>No Face</h3>`
            profileInfo_age.innerHTML = ``
            // profileInfo_features.innerHTML = ""
        }
    };

    // console.log('uuid: ', uuid);

    canvas.toBlob(function (blob) {
        xhr.send(blob);
    });
}

let userId = localStorage.getItem('userId'); // set userID if exists 
if(userId=="") {
    userId = uuidv4();
}
console.log('userId: ', userId);

function getDate(current) {    
    return current.toISOString().slice(0,10);
}

function getTime(current) {
    let time_map = [current.getHours(), current.getMinutes(), current.getSeconds()].map((a)=>(a < 10 ? '0' + a : a));
    return time_map.join(':');
}

function getMessage() {
    console.log('event for next');

    const uri = "chat";
    const xhr = new XMLHttpRequest();

    let requestId = uuidv4();
    let current = new Date();
    let datastr = getDate(current);
    let timestr = getTime(current);
    let requestTime = datastr+' '+timestr

    // isResponsed.put(requestId, false);
    // retryNum.put(requestId, 60); // max 300s (5x60)

    xhr.open("POST", uri, true);
    xhr.onreadystatechange = () => {
        if (xhr.readyState === 4 && xhr.status === 200) {
            response = JSON.parse(xhr.responseText);
            console.log("response: " + JSON.stringify(response));

            console.log('requestId: ', response.request_id);
            console.log('msg: ', response.msg);
            console.log('speech_uri: ', response.speech_uri);

            msgText.innerHTML = `<h5>${response.msg}</h5>`

            audio_file = 'https://d15oqygpysa1u.cloudfront.net/'+response.speech_uri
            console.log("speech: ", audio_file);
        }
        else if(xhr.readyState ===4 && xhr.status === 504) {
            console.log("response: " + xhr.readyState + ', xhr.status: '+xhr.status);
        }
        else {
            console.log("response: " + xhr.readyState + ', xhr.status: '+xhr.status);
        }
    };

    let text = "나이는 "+generation+"이고, "+gender+"이며, 기분은 "+emotionValue+"이에요."
    
    let requestObj = {
        "user_id": userId,
        "request_id": requestId,
        "request_time": requestTime,
        "type": "msg",
        "body": text
    }
    console.log("request: " + JSON.stringify(requestObj));

    var blob = new Blob([JSON.stringify(requestObj)], {type: 'application/json'});

    xhr.send(blob);   
}

function playSpeech() {
    console.log('event for play');

    let audio = new Audio(audio_file);
    audio.play();
}

function uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}
