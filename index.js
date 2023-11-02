const express = require('express');
const axios = require('axios');

const helmet = require('helmet');
const cors = require('cors');
var compression = require('compression')


const rateLimit = require('express-rate-limit');


require('dotenv').config();
const port = process.env.PORT || 3000;

const { IgApiClient } = require('instagram-private-api');

const app = express();

app.set('trust proxy', true);

app.use(express.json());



const corsOptions = {
  origin: '',
};

app.use(cors(corsOptions));
app.use(compression());

app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'"],
    imgSrc: ["'self'"],
    fontSrc: ["'self'"],
    connectSrc: ["'self'"],
    objectSrc: ["'none'"],
  },
}));


const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100, 
  message: 'Too many requests, please try again later.',
});

app.use(limiter);

const ig = new IgApiClient();

app.post('/login/:id', async (req, res) => {
  const type = req.params.id;

  const loginUser = async (username, password) => {
    try {
      ig.state.generateDevice(username);
      ig.state.proxyUrl = process.env.IG_PROXY;

      await ig.simulate.preLoginFlow();
      const loggedInUser = await ig.account.login(username, password);
      console.log(type + ' instagram logged in as', loggedInUser.username);

      res.status(201).send({ success: "success" });
    } catch (error) {
      console.log(error);
      res.status(201).send({ success: "fail" });
    }
  }

  switch (type) {
    case "fitness":

      await loginUser(process.env.FITNESS_USERNAME, process.env.FITNESS_PASSWORD);

      break;
    case "exploration":
    case "life":

      await loginUser(process.env.TRAVEL_USERNAME, process.env.TRAVEL_PASSWORD);

      break;
    default:
      res.status(201).send({ success: "fail", message: "Specify type of account" });
      break;
  }
});

async function downloadImageAsFile(imageURL) {
  try {
    const response = await axios.get(imageURL, { responseType: 'arraybuffer' });
    if (response.status === 200) {
      return Buffer.from(response.data);
    } else {
      throw new Error('Failed to download the image');
    }
  } catch (error) {
    throw error;
  }
}

app.post('/post/:id', async (req, res) => {
  const type = req.body.id;

  const getRandomImage = async () => {
    try {
      const unsplashAPIKey = process.env.UNSPLASH_API_KEY;

      const response = await axios.get('https://api.unsplash.com/photos/random', {
        headers: {
          Authorization: `Client-ID ${unsplashAPIKey}`,
        },
        params: {
          query: type === 'fitness' ? 'fitness' : (type === 'exploration' || type === 'life') ? 'travel' : 'travel',
          orientation: 'squarish',
          stats: 'true'
        },
      });

      const imageURL = response.data.urls.regular;
      return await downloadImageAsFile(imageURL);


    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch a random fitness image' });
    }
  }

  const getRandomQuote = async () => {
    try {
      const apiKey = process.env.NINJA_API_KEY;
      const response = await axios.get('https://api.api-ninjas.com/v1/quotes', {
        headers: {
          'X-Api-Key': `${apiKey}`,
        },
        params: {
          category: type === 'fitness' ? 'fitness' : type === 'exploration' ? 'exploration' : 'life',
        },
      });
      const data = await response.data[0];
      return data;

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch a random fitness quote' });
    }
  }
  const image = await getRandomImage();
  const quote = await getRandomQuote();
  if (image && quote) {

    await ig.publish.photo({
      file: image,
      caption: quote.quote + " - " + quote.author + "\n\n" + (type === 'fitness' ? '#bodygoals #fitfam #fitspo #fitspo #abs #fitness #workoutroutine #gym #gymmotivation #sixpack #fitnessmotivation #gains #workout #workoutmotivation' : '#travel #nature #travelawesome #travelblogger #traveladdict #instatravel #traveling #places #placestovisit #worldplaces #visit #travelinspo #beautifulplaces #AdventureSeeker #TravelPhotography')
    });
    console.log('Media uploaded');
    res.status(201).send({ success: "success" });
  } else {
    res.status(201).send({ success: "fail" });
  }
});

app.listen(port, () => console.log("Server running on port " + port))


