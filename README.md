# DWU WiFi Token Manager/Generator
#### Manages your wifi tokens.

## How to use it
1. Download mongodb client and node.js cli and install them on your machine
2. Pull the repository onto your local machine and cd into the folder
3. Run `npm install` to install dependencies
4. Run `npm start` to start
5. Open browser to `localhost:5000/tokens` to see all your tokens
6. To add token do `localhost:5000/data?code=token` replacing `token1...` with your tokens.
7. Do `http://localhost:5000/tokens?sort=token&status=valid` to filter only valid tokens. Do `http://localhost:5000/tokens?sort=token&status=exceeded` to filter only tokens that exceeds data limit

# Contribute
Show your support by 🌟 the project!!

Feel free to contribute!!

### License
This project is released under [MIT License](https://opensource.org/licenses/MIT) or [MIT License](LICENSE.txt).
