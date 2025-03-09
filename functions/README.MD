### Setup

* `npm install -g firebase-tools`
* `firebase login`
*  `firebase use --add` (or `firebase init functions` if creating new folder for new set of functions, in which case also run `npm i typescript@latest`)

### Updates

* `firebase use`
* Make changes
* `firebase deploy --only functions`