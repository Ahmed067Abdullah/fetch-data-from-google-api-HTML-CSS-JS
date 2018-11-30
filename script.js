const API_KEY = "YOUR_API_KEY_HERE";

const FETCH_IMAGE_URL_PREFIX =
  "https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=";
const FETCH_IMAGE_URL_POSTFIX = `&sensor=false&key=${API_KEY}`;
// const GOOGLE_PLACES_API =
//   `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=24.860700,67.00110&radius=1500&type=restaurant&key=${API_KEY}`;

const placeholders = {
  lat: "Enter Latitude",
  lng: "Enter Longitude"
};

// to contain all data fetched from series of requests
let bigData = [];

// to save next page token
let nextPageToken = null;

const initFetching = () => {
  let lat = document.getElementById("lat").value.trim();
  let lng = document.getElementById("lng").value.trim();
  if (lat != "" && lng != "") {
    console.log("Initializing...");
    document.querySelector(".submit-button").disabled = true;
    document.getElementById("message").innerHTML = "Please Wait...";
    GOOGLE_PLACES_API = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&rankby=distance&type=restaurant&key=${API_KEY}`;
    fetchData()
      .then(res => {
        if (nextPageToken) {
          console.log("Waiting...");
          setTimeout(() => {
            fetchData(nextPageToken)
              .then(res => {
                if (nextPageToken) {
                  console.log("Waiting...");
                  setTimeout(() => {
                    fetchData(nextPageToken)
                      .then(res => {
                        console.log("end");
                        finishedFetching();
                      })
                      .catch(err => error(err));
                  }, 3000);
                } else {
                  finishedFetching();
                }
              })
              .catch(err => error(err));
          }, 3000);
        } else {
          finishedFetching();
        }
      })
      .catch(err => error(err));
  } else {
    alert("Enter all details");
  }
  return false;
};

const error = error => {
  console.log("Error: ", error);
  document.querySelector(".submit-button").disabled = false;
  document.getElementById("message").innerHTML = "";
  alert("Some Error Occured, Please Check console for details");
};

// to fetch data from google api and return a promise
const fetchData = (nextPage = null) => {
  return new Promise((resolve, reject) => {
    let url = GOOGLE_PLACES_API;
    if (nextPage)
      url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?pagetoken=${nextPage}&key=${API_KEY}`;
    console.log("fetching");
    axios
      .get(url)
      .then(res => {
        console.log("response", res.data.results);
        nextPageToken = res.data.next_page_token;
        parseData(res.data.results);
        resolve("okay");
      })
      .catch(err => {
        nextPageToken = null;
        reject(err);
      });
  });
};

// to form data returned from latest req in the structure we want and concatenate it in the bigData array
const parseData = data => {
  const clippedData = data.map(singleData => {
    let images = [];

    // if images exist in the response then transform their url
    if (singleData.photos) {
      images = singleData.photos.map(
        singlePhoto =>
          FETCH_IMAGE_URL_PREFIX +
          singlePhoto.photo_reference +
          FETCH_IMAGE_URL_POSTFIX
      );
    }

    // restructuring object
    return {
      id: singleData.id,
      latLng: { ...singleData.geometry.location },
      photos: [...images],
      title: singleData.name,
      active: false
    };
  });
  console.log("clipped data", clippedData);
  bigData = [...clippedData, ...bigData];
  console.log("big data", bigData);
};

// to save data in localStorage after fetching from api
const saveData = () => {
  if (bigData.length > 0) {
    var existingRecords = [];
    var localStorageData = localStorage.getItem("places");
    let count = 0;
    if (localStorageData !== null) {
      console.log("editing old");
      existingRecords = JSON.parse(localStorageData);

      // filter the currently fetched data from stored in bigData array, only save a record if a matched ID is NOT found in the localStorage
      let nonRepeatedData = bigData.filter(singleDataSet => {
        if (
          existingRecords.find(
            singleExistingRecord => singleDataSet.id === singleExistingRecord.id
          ) === undefined
        )
          return true;
        return false;
      });

      console.log("existing Records", existingRecords);
      console.log("non repeated", nonRepeatedData);
      count = nonRepeatedData.length;
      const newArray = [...existingRecords, ...nonRepeatedData];
      console.log("new array", newArray);
      total = newArray.length;
      localStorage.setItem("places", JSON.stringify(newArray));
    } else {
      console.log("Adding new");
      existingRecords = [...bigData];
      count = bigData.length;
      total = count;
      localStorage.setItem("places", JSON.stringify(existingRecords));
    }
    alert(
      "Data Saved Successfully," +
        count +
        " records inserted, Total saved records are: " +
        total
    );
  } else {
    alert("No records Fetched");
  }
};

const finishedFetching = () => {
  saveData();
  bigData = [];
  document.querySelector(".submit-button").disabled = false;
  document.getElementById("message").innerHTML = "";
};

const downloadFile = () => {
  var records = localStorage.getItem("places");
  var a = document.createElement("a");
  var file = new Blob([records], { type: "text/json" });
  a.href = URL.createObjectURL(file);
  a.download = "records.json";
  a.click();
};

const focused = field => {
  var input = document.getElementById(field);
  input.placeholder = "";
  input.parentNode.style.borderBottom = "2px solid #7f7f7f";
};

const unFocused = field => {
  var input = document.getElementById(field);
  input.placeholder = placeholders[field];
  input.parentNode.style.borderBottom = "2px solid #d9d9d9";
};

const removeDuplicates = arr => {
  let newArr = arr.filter(
    (place, index, self) => index === self.findIndex(p => p.id === place.id)
  );
  return newArr;
};
