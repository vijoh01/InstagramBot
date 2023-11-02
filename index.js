const express = require('express');
const axios = require('axios');

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
var compression = require('compression')

require('dotenv').config();

const { IgApiClient } = require('instagram-private-api');

const app = express();

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
    windowMs: 15 * 60 * 1000,
    max: 100, // Max requests
  });

app.use('/api/', limiter);


const ig = new IgApiClient();

app.post('/login', async (req, res) => {
    try {
    ig.state.generateDevice(process.env.IG_USERNAME);
    ig.state.proxyUrl = process.env.IG_PROXY;


    await ig.simulate.preLoginFlow();
    const loggedInUser = await ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);
    console.log('Logged in as', loggedInUser.username);

    res.status(201).send({ success: "success" });
    } catch (error) {
        console.log(error);
        res.status(201).send({ success: "fail" });
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

app.post('/post', async (req, res) => {
    const getRandomImage = async () => {
        try {
            const unsplashAPIKey = process.env.UNSPLASH_API_KEY;
    
            const response = await axios.get('https://api.unsplash.com/photos/random', {
                headers: {
                    Authorization: `Client-ID ${unsplashAPIKey}`,
                },
                params: {
                    query: 'fitness',
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
                    category: 'fitness'
                },
            });
           
            return response.data[0].quote;
            
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch a random fitness quote' });
        }
    }
    const image = await getRandomImage();
    const quote = await getRandomQuote();
    if (image && quote){

    const media = await ig.publish.photo({
        file: image,
        caption: quote + '\n\n#Fitness #Workout #Gym #Exercise #Health #FitnessMotivation #HealthyLifestyle #FitLife #GetFit #FitnessGoals #WeightLoss #StrengthTraining #Cardio #Nutrition #FitFam #BodyBuilding #CrossFit #Running #Yoga #OutdoorFitness #Wellness #ActiveLife #FitnessJourney #Muscle #Training #Sweat #Motivation #HealthyChoices #NoExcuses #HealthAndFitness',
    });
    console.log('Media uploaded:', media);
    res.status(201).send({ success: "success" });
    } else {
        res.status(201).send({ success: "fail" });
    }
});

app.listen(3000, () => console.log("Server running on port http://localhost:3000/"))


