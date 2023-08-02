const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const request = require('request');
const https = require('https');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 8000;

app.set('view engine', 'ejs')

// Middleware for parsing request body and session setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'your-secret-key', // Replace with a random secret key
  resave: false,
  saveUninitialized: true,
}));

// Fake user credentials for demonstration (replace with your real authentication logic)
const fakeUser = {
  username: 'oleB',
  password: 'olesFlotteDagbog',
};

// Middleware to check if the user is logged in
function requireLogin(req, res, next) {
  if (!req.session.isLoggedIn) {
    return res.redirect('/login');
  }
  next();
}

// Home route
app.get('/', requireLogin, (req, res) => {
  const { username } = req.session.user;
  res.render('index', { username });
});

// Login route (GET)
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// Login route (POST)
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === fakeUser.username && password === fakeUser.password) {
    req.session.isLoggedIn = true;
    req.session.user = { username };
    res.redirect('/');
  } else {
    res.render('login', { error: 'Invalid username or password.' });
  }
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/login');
  });
});

// An asynchronous function that waits for a given number of milliseconds and then calls another function
async function waitAndCall(milliseconds, callback) {
    await new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    });
    callback(); // Call the function after the wait is over
}

function fetchImage(key, id) {
    var options = {
        'method': 'POST',
        'url': 'https://stablediffusionapi.com/api/v4/dreambooth/fetch',
        'headers': {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          "key": key,
          "request_id": id
        })
      };
      
      request(options, function (error, response) {
        if (error) throw new Error(error);
        console.log(response.body);
        const responseData = JSON.parse(body);
        return responseData.output
      });
}

// Handle form submission
app.post('/', (req, res) => {
  processing = true;
  eta = null;
  //res.render('processing', {processing, eta} );

  const userInput = req.body.text;
  userInputValue = req.body.text;
  const apiKey = 'FBFGp16pV56I3bmGcVBt7pKGW1sE96GtWdNJyo5oaW3cVry1JsW6HVnrcsMq'; // Replace this with your API key

  const options = {
    method: 'POST',
    url: 'https://stablediffusionapi.com/api/v3/text2img',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      key: apiKey,
      prompt: userInput,
      width: '512',
      height: '512',
      samples: '1',
      num_inference_steps: '20',
      guidance_scale: 7.5,
      safety_checker: 'yes',
      multi_lingual: 'no',
      panorama: 'no',
      self_attention: 'no',
      upscale: 'no',
      embeddings_model: null,
      webhook: null,
      track_id: null
    })
  };
  

  // Make API call to Stable Diffusion API using 'request' library
  request(options, (error, response, body) => {
    if (error) {
      console.error('Error while making API call:', error);
      res.render('error', {error});
    } 
    else {
      const responseData = JSON.parse(body);
      imageUrl = responseData.output;
      console.log(responseData)
      console.log(imageUrl)
      console.log(imageUrl.length)

      if ( responseData.status == 'error') {
        serverStatus = responseData.status
        message = responseData.message
        console.log('error')

        res.render('error', {serverStatus, message });
        return;
      }
      if ( responseData.status === 'processing') {
        console.log('fetch')
        eta = responseData.eta
        res.render('processing', {processing, eta} );
        imageId = responseData.id
        fetchImageUrl = waitAndCall(eta*1100, fetchImage(apiKey, imageId))
        return
      }
      if (imageUrl && imageUrl.length != 0){
        console.log('result')
        res.render('result', { imageUrl, userInputValue });
      }
    };
      
   });
});

// Function to save an image to a file
function saveImageToFile(imageUrl, filePath) {
    console.log(imageUrl)
    const fileStream = fs.createWriteStream(filePath);
    https.get(imageUrl, (response) => {
      if (response.statusCode === 200) {
        response.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          console.log('Image saved successfully:', filePath);
        });
      } else {
        console.error('Error while fetching the image. Status code:', response.statusCode);
      }
    }).on('error', (error) => {
      console.error('Error while fetching the image:', error);
    });
  }
  

// Handle 'tilfreds' button click
app.post('/saveImage', (req, res) => {
    if (imageUrl) {
      // Create a directory named 'images' to store the images if it doesn't exist
      const imagesDir = path.join(__dirname, 'images');
      saveImageToFile(imageUrl, imagesDir+'/generated_${Date.now()}.png')
    }
});


// Start the server
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
