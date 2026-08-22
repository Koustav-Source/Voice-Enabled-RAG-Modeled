const input =
  document.getElementById("input");

const sendBtn =
  document.getElementById("sendBtn");

const micBtn =
  document.getElementById("micBtn");

const bigMic =
  document.getElementById("bigMic");

const listenText =
  document.getElementById("listenText");

const answerText =
  document.getElementById("answerText");

const sourceGrid =
  document.getElementById("sourceGrid");

const statusText =
  document.getElementById("statusText");

const genStatus =
  document.getElementById("genStatus");

const pipelineRows =
  [...document.querySelectorAll(".step")];


/* =========================
   STATUS
========================= */

function setStatus(text) {

  statusText.textContent =
    text;
}


/* =========================
   TEXT TO SPEECH
========================= */

function speak(text) {

  if (
    !window.speechSynthesis ||
    !text
  ) {
    return;
  }

  window.speechSynthesis.cancel();

  const utterance =
    new SpeechSynthesisUtterance(text);

  utterance.lang = "en-IN";

  utterance.rate = 0.95;

  utterance.pitch = 1;

  window.speechSynthesis.speak(
    utterance
  );
}


/* =========================
   PIPELINE
========================= */

function setPipeline(
  activeIndex = -1,
  done = false
) {

  pipelineRows.forEach(
    (row, index) => {

      const icon =
        row.querySelector(
          ".step-icon"
        );

      const ok =
        row.querySelector(
          ".ok"
        );

      if (
        index <= activeIndex ||
        done
      ) {

        row.classList.remove(
          "pending"
        );

        if (ok) {
          ok.textContent = "✓";
        }

      } else {

        row.classList.add(
          "pending"
        );
      }
    }
  );

  genStatus.textContent =
    done
      ? "✓"
      : activeIndex >= 3
        ? "◌"
        : "✓";
}


/* =========================
   SOURCES
========================= */

function renderSources(
  sources = []
) {

  sourceGrid.innerHTML = "";

  if (!sources.length) {

    sourceGrid.innerHTML = `
      <div class="source empty">
        <b>No matching chunks</b>
        The local RAG index did not find
        supporting evidence.
      </div>
    `;

    return;
  }


  sources.forEach(source => {

    const card =
      document.createElement(
        "div"
      );

    card.className =
      "source";


    const link =
      source.url

        ? `
          <a
            href="${source.url}"
            target="_blank"
            rel="noopener noreferrer"
          >
            ${source.source || "Source"} ↗
          </a>
        `

        : `
          <span>
            ${source.source || "Local source"}
          </span>
        `;


    card.innerHTML = `

      <b>${link}</b>

      <div>
        ${source.title}
      </div>

      <div class="score">
        Score:
        ${Number(source.score).toFixed(2)}
      </div>

    `;


    sourceGrid.appendChild(card);
  });
}


/* =========================
   ASK AI
========================= */

async function askAI() {

  const question =
    input.value.trim();


  if (!question) {
    return;
  }


  sendBtn.disabled = true;

  micBtn.disabled = true;

  listenText.textContent =
    "Processing...";


  setStatus(
    "Retrieving context..."
  );

  setPipeline(0);


  try {

    setTimeout(() => {

      setStatus(
        "Transcribing + retrieving..."
      );

    }, 250);


    setTimeout(() => {

      setPipeline(2);

    }, 700);


    setTimeout(() => {

      setStatus(
        "Generating grounded answer..."
      );

      setPipeline(3);

    }, 1100);


    const response =
      await fetch(
        "/api/chat",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              message: question
            })
        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.error ||
        "Server error"
      );
    }


    answerText.textContent =
      data.answer ||
      "No answer was returned.";


    renderSources(
      data.sources
    );


    setPipeline(
      4,
      true
    );


    setStatus(
      data.grounded
        ? "Grounded answer ready ✓"
        : "Insufficient evidence"
    );


    listenText.textContent =
      "Answer ready";


    speak(
      data.answer || ""
    );

  }

  catch (error) {

    console.error(error);


    answerText.textContent =
      "Sorry, I couldn't connect " +
      "to the AI server. Make sure " +
      "server.js is running and your " +
      "Gemini API key is configured.";


    renderSources([]);


    setStatus(
      "Connection error"
    );


    listenText.textContent =
      "Connection error";
  }

  finally {

    sendBtn.disabled = false;

    micBtn.disabled = false;
  }
}


/* =========================
   SEND
========================= */

sendBtn.addEventListener(
  "click",
  askAI
);


/* =========================
   ENTER
========================= */

input.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Enter"
    ) {

      event.preventDefault();

      askAI();
    }
  }
);


/* =========================
   COPY
========================= */

document
  .getElementById("copyBtn")
  .addEventListener(
    "click",
    async () => {

      await navigator
        .clipboard
        ?.writeText(
          answerText.textContent
        );

      setStatus(
        "Answer copied ✓"
      );
    }
  );


/* =========================
   PLAY
========================= */

document
  .getElementById("playBtn")
  .addEventListener(
    "click",
    () => {

      speak(
        answerText.textContent
      );

      setStatus(
        "Playing answer..."
      );
    }
  );


/* =========================
   ASK AGAIN
========================= */

document
  .getElementById("againBtn")
  .addEventListener(
    "click",
    () => {

      input.value = "";

      input.focus();

      setStatus(
        "Ready for another question"
      );
    }
  );


/* =========================
   SPEECH RECOGNITION
========================= */

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;


let recognition = null;

let listening = false;


if (SpeechRecognition) {

  recognition =
    new SpeechRecognition();


  recognition.lang =
    "en-IN";


  recognition.continuous =
    false;


  recognition.interimResults =
    true;


  recognition.onstart =
    () => {

      listening = true;

      listenText.textContent =
        "Listening...";

      micBtn.textContent =
        "⏹";

      bigMic.classList.add(
        "active"
      );

      setStatus(
        "Listening for your question..."
      );
    };


  recognition.onresult =
    event => {

      let transcript = "";


      for (
        let i =
          event.resultIndex;

        i <
          event.results.length;

        i++
      ) {

        transcript +=
          event.results[i][0]
            .transcript;
      }


      input.value =
        transcript;


      const last =
        event.results[
          event.results.length - 1
        ];


      if (
        last.isFinal
      ) {

        askAI();
      }
    };


  recognition.onerror =
    event => {

      console.error(
        "Speech recognition:",
        event.error
      );

      listenText.textContent =
        "Microphone error";

      setStatus(
        "Microphone error"
      );
    };


  recognition.onend =
    () => {

      listening = false;

      micBtn.textContent =
        "🎙";

      bigMic.classList.remove(
        "active"
      );


      if (
        listenText.textContent ===
        "Listening..."
      ) {

        listenText.textContent =
          "Ready";
      }
    };


  function toggleRecognition() {

    if (listening) {

      recognition.stop();

      return;
    }


    recognition.start();
  }


  micBtn.addEventListener(
    "click",
    toggleRecognition
  );


  bigMic.addEventListener(
    "click",
    toggleRecognition
  );

}

else {

  micBtn.disabled = true;

  bigMic.classList.add(
    "unsupported"
  );

  listenText.textContent =
    "Voice unsupported";
}


/* =========================
   INITIAL SOURCES
========================= */

renderSources([]);