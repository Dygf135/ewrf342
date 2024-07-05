const { executablePath } = require('puppeteer');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function run() {
    const browser = await puppeteer.launch({
        headless: false,
        devtools: true,
        args: [
            '--allow-external-pages',
            '--allow-third-party-modules',
            '--data-reduction-proxy-http-proxies',
            '--disable-web-security',
            '--enable-automation',
            '--disable-features=IsolateOrigins,site-per-process,SitePerProcess',
            '--flag-switches-begin --disable-site-isolation-trials --flag-switches-end',
        ],
        executablePath: executablePath(),
    });

    const page = await browser.newPage();
    await page.goto("https://patrickhlauke.github.io/recaptcha/", { waitUntil: 'networkidle0' });

    console.log('Page loaded.');

    // Solver code
    await page.evaluate(() => {
        import("https://cdn.jsdelivr.net/npm/axios@1.1.2/dist/axios.min.js")

        function qSelectorAll(selector) {
            return document.querySelector('iframe[src*="api2/anchor"]').contentWindow.document.querySelectorAll(selector);
        }

        function qSelector(selector) {
            return document.querySelector('iframe[src*="api2/anchor"]').contentWindow.document.querySelector(selector);
        }

        function ifqSelector(selector) {
            return document.querySelector('iframe[src*="api2/bframe"]').contentWindow.document.querySelector(selector);
        }

        var solved = false;
        var checkBoxClicked = false;
        var waitingForAudioResponse = false;
        // Node Selectors
        const CHECK_BOX = ".recaptcha-checkbox-border";
        const AUDIO_BUTTON = "#recaptcha-audio-button";
        const PLAY_BUTTON = ".rc-audiochallenge-play-button .rc-button-default";
        const AUDIO_SOURCE = "#audio-source";
        const IMAGE_SELECT = "#rc-imageselect";
        const RESPONSE_FIELD = ".rc-audiochallenge-response-field";
        const AUDIO_ERROR_MESSAGE = ".rc-audiochallenge-error-message";
        const AUDIO_RESPONSE = "#audio-response";
        const RELOAD_BUTTON = "#recaptcha-reload-button";
        const RECAPTCHA_STATUS = "#recaptcha-accessible-status";
        const DOSCAPTCHA = ".rc-doscaptcha-body";
        const VERIFY_BUTTON = "#recaptcha-verify-button";
        const MAX_ATTEMPTS = 5;
        var requestCount = 0;
        var recaptchaLanguage = qSelector("html").getAttribute("lang");
        var audioUrl = "";
        var recaptchaInitialStatus = qSelector(RECAPTCHA_STATUS) ? qSelector(RECAPTCHA_STATUS).innerText : ""
        var serversList = ["https://engageub.pythonanywhere.com", "https://engageub1.pythonanywhere.com"];
        var latencyList = Array(serversList.length).fill(10000);
        // Check for visibility && Click the check box
        function isHidden(el) {
            return (el.offsetParent === null)
        }

        async function getTextFromAudio(URL) {
            var minLatency = 100000;
            var url = "";

            // Selecting the last/latest server by default if latencies are equal
            for (let k = 0; k < latencyList.length; k++) {
                if (latencyList[k] <= minLatency) {
                    minLatency = latencyList[k];
                    url = serversList[k];
                }
            }

            requestCount = requestCount + 1;
            URL = URL.replace("recaptcha.net", "google.com");
            if (recaptchaLanguage.length < 1) {
                console.log("Recaptcha Language is not recognized");
                recaptchaLanguage = "en-US";
            }
            console.log("Recaptcha Language is " + recaptchaLanguage);

            axios({
                method: "POST",
                url: url,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                data: "input=" + encodeURIComponent(URL) + "&lang=" + recaptchaLanguage,
                timeout: 60000,
            }).then((response) => {
                console.log("Response::" + response.data);
                try {
                    if (!!response && !!response.data) {
                        var responseText = response.data;
                        console.log("responseText")
                        // Validate Response for error messages or html elements
                        if (responseText == "0" || responseText.includes("<") || responseText.includes(">") || responseText.length < 2 || responseText.length > 50) {
                            // Invalid Response, Reload the captcha
                            console.log("Invalid Response. Retrying..");
                        } else if (!!ifqSelector(AUDIO_SOURCE) && !!ifqSelector(AUDIO_SOURCE).src && audioUrl == ifqSelector(AUDIO_SOURCE).src && !!ifqSelector(AUDIO_RESPONSE)
                            && !ifqSelector(AUDIO_RESPONSE).value && !!ifqSelector(VERIFY_BUTTON)) {
                            ifqSelector(AUDIO_RESPONSE).value = responseText;
                            ifqSelector(VERIFY_BUTTON).click();
                        } else {
                            console.log("Could not locate text input box")
                        }
                        waitingForAudioResponse = false;
                    }

                } catch (err) {
                    console.log(err.message);
                    console.log("Exception handling response. Retrying..");
                    waitingForAudioResponse = false;
                }
            }).catch((e) => {
                console.log(e);
                waitingForAudioResponse = false;
            });
        }

        async function pingTest(url) {
            var start = new Date().getTime();
            axios({
                method: "GET",
                url: url,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                data: "",
                timeout: 15000
            }).then((response) => {
                console.log(response)
                if (!!response && !response.data && response.data == "0") {
                    var end = new Date().getTime();
                    var milliseconds = end - start;
                    console.log(milliseconds)
                    // For large values use Hashmap
                    for (let i = 0; i < serversList.length; i++) {
                        if (url == serversList[i]) {
                            latencyList[i] = milliseconds;
                        }
                    }
                }
            });
        }

        if (qSelector(CHECK_BOX)) {
            qSelector(CHECK_BOX).click();
        } else if (window.location.href.includes("bframe")) {
            for (let i = 0; i < serversList.length; i++) {
                pingTest(serversList[i]);
            }
        }

        // Solve the captcha using audio
        var startInterval = setInterval(function () {
            try {
                if (!checkBoxClicked && !!qSelector(CHECK_BOX) && !isHidden(qSelector(CHECK_BOX))) {
                    //console.log("checkbox clicked");
                    qSelector(CHECK_BOX).click();
                    checkBoxClicked = true;
                }
                // Check if the captcha is solved
                if (!!qSelector(RECAPTCHA_STATUS) && (qSelector(RECAPTCHA_STATUS).innerText != recaptchaInitialStatus)) {
                    solved = true;
                    console.log("SOLVED");
                    clearInterval(startInterval);
                }
                if (requestCount > MAX_ATTEMPTS) {
                    console.log("Attempted Max Retries. Stopping the solver");
                    solved = true;
                    clearInterval(startInterval);
                }
                if (!solved) {
                    if (!!ifqSelector(AUDIO_BUTTON) && !isHidden(ifqSelector(AUDIO_BUTTON)) && !!ifqSelector(AUDIO_BUTTON).offsetParent
                        && !waitingForAudioResponse) {
                        ifqSelector(AUDIO_BUTTON).click();
                        waitingForAudioResponse = true;
                    } else if (!!ifqSelector(IMAGE_SELECT) && !isHidden(ifqSelector(IMAGE_SELECT)) && !!qSelector(RELOAD_BUTTON)
                        && !isHidden(qSelector(RELOAD_BUTTON))) {
                        console.log("Could not Solve the Image Captcha. Reloading..")
                        qSelector(RELOAD_BUTTON).click();
                    } else if (!!ifqSelector(PLAY_BUTTON) && !isHidden(ifqSelector(PLAY_BUTTON))
                        && !!ifqSelector(AUDIO_SOURCE) && !!ifqSelector(AUDIO_SOURCE).src) {
                        audioUrl = ifqSelector(AUDIO_SOURCE).src;
                        getTextFromAudio(audioUrl);
                    } else if (!!ifqSelector(AUDIO_ERROR_MESSAGE) && !isHidden(ifqSelector(AUDIO_ERROR_MESSAGE)) && !!ifqSelector(VERIFY_BUTTON)
                        && !isHidden(ifqSelector(VERIFY_BUTTON))) {
                        ifqSelector(VERIFY_BUTTON).click();
                    } else if (!!ifqSelector(RESPONSE_FIELD) && !isHidden(ifqSelector(RESPONSE_FIELD)) && !!ifqSelector(RELOAD_BUTTON)
                        && !isHidden(ifqSelector(RELOAD_BUTTON))) {
                        if (ifqSelector(RESPONSE_FIELD).innerText.includes("Multiple correct solutions required")) {
                            console.log("Complex Image Captcha found. Reloading..");
                        } else {
                            console.log("Captcha could not be solved. Reloading..");
                        }
                        qSelector(RELOAD_BUTTON).click();
                    } else if (!!ifqSelector(DOSCAPTCHA) && !isHidden(ifqSelector(DOSCAPTCHA))) {
                        solved = true;
                        clearInterval(startInterval);
                    }
                }
            } catch (err) {
                console.log("Exception in Interval Loop: " + err.message);
                if (err.message.includes("document.querySelector") || err.message.includes("contentWindow.document.querySelector")) {
                    console.log("Error while accessing selectors");
                    clearInterval(startInterval);
                }
            }
        }, 10000);
    });

    // Wait for the CAPTCHA to be solved
    await page.waitForFunction(() => {
        const recaptchaStatus = document.querySelector('iframe[src*="api2/anchor"]').contentWindow.document.querySelector('#recaptcha-accessible-status');
        return recaptchaStatus && recaptchaStatus.innerText.includes('You are verified');
    }, { timeout: 60000 });

    // Take a screenshot after CAPTCHA is solved
    await page.screenshot({ path: 'screenshot.png' });
    console.log('Screenshot taken after CAPTCHA is solved.');

    await browser.close();
}

run();
