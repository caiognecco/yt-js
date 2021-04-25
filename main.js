function loadButtons() {
  const htmlFinal = `
<span style="color: white; font-size: 1.5rem">Para ver as próximas transmissões e participar das lives, é necessário autorizar nosso site com sua conta Google.<br><br>
Você também pode ver diretamente no YouTube</span><br><br>
<button onclick="authenticate().then(loadClient)">Autorizar Google/YouTube</button>
<button onclick="window.open('https://www.youtube.com/c/CaioSoutoConversa%C3%A7%C3%B5esfilos%C3%B3ficas/videos?view=2&live_view=502')">Ver no Youtube</button><br><br>
<small><a href="https://www.caiosouto.com/politica-de-privacidade">Leia nossa Política de Privacidade</a></small>
`;
  if (window.location.href.includes("com/agenda")) {
    document.querySelector("#result").innerHTML = htmlFinal;
  } else {
    document.querySelector("#liveWrapper").style.display = "none";
    document.querySelector("#loginWrapper").style.display = "block";
    document.querySelector("#loginWrapper").innerHTML = htmlFinal;
  }
}

function errorMessage(func, err) {
  document.querySelector("#result").innerHTML = `
<span style="color: white; font-size: 1.5rem">Sentimos muito. Ocorreu um erro ao ${func}. Tente recarregar a página ou volte mais tarde.</span><br><br>
<small><a href="https://www.caiosouto.com/politica-de-privacidade">Leia nossa Política de Privacidade</a></small><br><br>
<small>Mensagem do erro: ${err.message}</small>
`;
}

function authenticate() {
  return gapi.auth2
    .getAuthInstance()
    .signIn({
      scope: "https://www.googleapis.com/auth/youtube.force-ssl",
      prompt: "select_account",
    })
    .then(
      function () {
        loadClient();
      },
      function (err) {
        errorMessage("autenticar com a conta Google", err);
      }
    );
}

function loadClient() {
  gapi.client.setApiKey("<YOUR_API_KEY>");
  return gapi.client
    .load("https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest")
    .then(
      function () {
        if (window.location.href.includes("agenda")) {
          executeUpcoming();
        }
        executeLiveChecking();
      },
      function (err) {
        errorMessage("carregar cliente do YouTube"), err;
      }
    );
}

function executeLiveChecking() {
  return gapi.client.youtube.search
    .list({
      part: ["id"],
      channelId: "<YOUR_CHANNEL_ID>",
      eventType: "live",
      maxResults: 1,
      type: ["video"],
    })
    .then(
      function (response) {
        // Handle the results here (response.result has the parsed body).
        const id =
          response.result.items.length === 1
            ? response.result.items[0].id.videoId
            : false;
        // const id = 'I83XWCSBgSc'
        if (id) {
          gapi.client.youtube.videos
            .list({
              part: ["liveStreamingDetails", "id", "snippet"],
              id,
            })
            .then(
              function (response) {
                let element;
                const id = response.result.items[0].id;
                const chatId =
                  response.result.items[0].liveStreamingDetails
                    .activeLiveChatId;
                window.chatId = chatId;
                if (window.location.href.includes("vivo")) {
                  loadLive(id, chatId);
                } else {
                  element = document.querySelector("#live");
                  element.innerHTML = `
<span style="color: white; font-size: 1rem"><i class="fas fa-broadcast-tower" style="position: absolute;
    left: 1rem;"></i> Ao Vivo! <a href="https://caiosouto.com/vivo" style="color: #ddd">Clique e participe!</a>&nbsp;&nbsp;&nbsp;<i style="cursor: pointer; position: absolute;
    right: 1rem;" class="fas fa-close" onclick="document.querySelector('#live').style.display = 'none'"></i></span><br>
<iframe id="ytplayerHome" type="text/html" width="640" height="360"
  src="https://www.youtube.com/embed/${id}?autoplay=1&mute=1&origin=http://example.com"
  frameborder="0"/>`;
                  element.style.display = "flex";
                }
                document.querySelector("#liveMenu").style.display = "block";
              },
              function (err) {
                console.log("erro ao carregar vídeo ao vivo");
              }
            );
        } else {
          let element;
          if (window.location.href.includes("vivo")) {
            document.querySelector("#liveWrapper").style.display = "none";
            document.querySelector("#loginWrapper").style.display = "block";
            element = document.querySelector("#loginWrapper");
            element.innerHTML = `<span style="color: white; font-size: 1.5rem;">No momento não há nenhum vídeo sendo trasmitido. Veja as <a href="/agenda">próximas transmissões</a>.</span><br><br>`;
          }
        }
      },
      function (err) {
        console.log("erro ao listar vídeos ao vivo");
      }
    );
}

function countMessageLength() {
  console.log(document.querySelector("#commentText").value.length);
}

function loadLive(id, chatId) {
  document.querySelector("#liveWrapper").style.display = "block";
  document.querySelector("#loginWrapper").style.display = "none";
  window.comments = [];
  gapi.client.youtube.liveChatMessages
    .list({
      liveChatId: chatId,
      part: ["id, snippet, authorDetails"],
      maxResults: 20,
    })
    .then(
      (response) => {
        window.pageToken = response.result.nextPageToken;
        // Handle the results here (response.result has the parsed body).
        response.result.items.map((item) => {
          window.comments.push({
            id: item.id,
            name: item.authorDetails.displayName,
            img: item.authorDetails.profileImageUrl,
            message: item.snippet.displayMessage,
            date: item.snippet.publishedAt,
          });
        });
        writeComments(window.comments);
        document
          .querySelector("#commentText")
          .addEventListener("input", function () {
            const tarea = document.querySelector("#commentText");
            const span = document.querySelector("#commentLength");
            if (tarea.value.length < 201) {
              span.style.color = "white";
            } else {
              tarea.value = tarea.value.slice(0, 200);
              span.style.color = "red";
            }
            span.innerHTML = tarea.value.length + "/200";
          });
      },
      function (err) {
        console.error("Execute error", err);
      }
    );
  const video = document.querySelector("#liveAgenda");
  video.innerHTML = `
<iframe id="ytplayer" type="text/html" width="775" height="435" style="width: 775px; height:435px"
  src="https://www.youtube.com/embed/${id}?autoplay=1&mute=1&origin=http://example.com"
  frameborder="0"/>`;
}

function loadNewComments(ico) {
  if (ico.style.cursor === "pointer") {
    ico.style.color = "#999";
    ico.style.cursor = "not-allowed";
    ico.classList.add("spinning");
    gapi.client.youtube.liveChatMessages
      .list({
        liveChatId: chatId,
        part: ["id, snippet, authorDetails"],
        pageToken: window.pageToken,
        maxResults: 200,
      })
      .then((response) => {
        window.pageToken = response.result.nextPageToken;
        response.result.items.map((item) => {
          if (!window.comments.find((prev) => prev.id === item.id)) {
            window.comments.push({
              id: item.id,
              name: item.authorDetails.displayName,
              img: item.authorDetails.profileImageUrl,
              message: item.snippet.displayMessage,
              date: item.snippet.publishedAt,
            });
          }
        });
        writeComments(window.comments);
        ico.style.color = "#e5a102";
        ico.style.cursor = "pointer";
        ico.classList.remove("spinning");
      });
  }
}

function writeComments(comments) {
  const commentDiv = document.querySelector("#liveComments");
  commentDiv.innerHTML = "";
  comments.forEach((item) => {
    item.date = new Date(item.date);
    const finalDate =
      item.date.getHours() +
      ":" +
      ((item.date.getMinutes() < 10 ? "0" : "") + item.date.getMinutes());
    commentDiv.innerHTML += `
 <div class='speechbubble'>
    <p><img src="${item.img}" style="width: 2rem">&nbsp;${item.message}
      <span class='username'>  ${item.name} às ${finalDate}</span>
    </p>
  </div>
`;
    /*		commentDiv.innerHTML += `<li><img src="${item.img}" style="width: 2rem"> <small style="color:white">  ${item.name} comentou em  ${finalDate} </small>
            <br>
            <span>${item.message}</span></li>`*/
  });
  commentDiv.scrollTop = commentDiv.scrollHeight;
}

function sendComment(ico) {
  if (ico.style.cursor === "pointer") {
    ico.style.color = "#999";
    ico.style.cursor = "not-allowed";
    ico.classList.add("spinning");
    ico.classList.remove("fa-send");
    ico.classList.add("fa-spinner");
    const message = document.querySelector("#commentText");
    gapi.client.youtube.liveChatMessages
      .insert({
        part: ["snippet"],
        resource: {
          snippet: {
            liveChatId: window.chatId,
            type: "textMessageEvent",
            textMessageDetails: {
              messageText: message.value,
            },
          },
        },
      })
      .then(
        function (response) {
          // Handle the results here (response.result has the parsed body).
          if (response.status === 200) {
            ico.style.color = "green";
            ico.classList.remove("spinning");
            ico.classList.add("fa-check");
            ico.classList.remove("fa-spinner");
          } else {
            ico.style.color = "red";
            ico.classList.remove("spinning");
            ico.classList.add("fa-times");
            ico.classList.remove("fa-spinner");
          }
          const message = document.querySelector("#commentText");
          const refresh = document.querySelector("#refreshBtn");
          const span = document.querySelector("#commentLength");
          span.innerHTML = "0/200";
          span.style.color = "white";
          message.value = "";
          setTimeout(() => {
            ico.style.color = "#e5a102";
            ico.style.cursor = "pointer";
            ico.classList.add("fa-send");
            ico.classList.remove("fa-check");
            ico.classList.remove("fa-times");
            loadNewComments(refresh);
          }, 2000);
        },
        function (err) {
          console.error("Execute error", err);
        }
      );
  }
}

// Make sure the client is loaded and sign-in is complete before calling this method.
function executeUpcoming() {
  return gapi.client.youtube.search
    .list({
      part: ["id"],
      channelId: "<YOUR_CHANNEL_ID>",
      eventType: "upcoming",
      maxResults: 25,
      type: ["video"],
    })
    .then(
      function (response) {
        // Handle the results here (response.result has the parsed body).
        const id = [];
        response.result.items.map((item) => {
          id.push(item.id.videoId);
        });
        gapi.client.youtube.videos
          .list({
            part: ["liveStreamingDetails", "id", "snippet"],
            id,
          })
          .then(
            function (response) {
              // Handle the results here (response.result has the parsed body).
              document.querySelector("#result").innerHTML = "";
              let result = response.result.items;
              result = result.sort(function (a, b) {
                let dateA = new Date(a.liveStreamingDetails.scheduledStartTime);
                let dateB = new Date(b.liveStreamingDetails.scheduledStartTime);
                return dateA - dateB;
              });
              result.map((item) => {
                const title = item.snippet.title;
                const split = item.snippet.description.split("__________");
                let tags = split[split.length - 1].split("Filosóficas");
                tags = tags[tags.length - 1];
                const description = split[0];
                const dueDate = new Date(
                  item.liveStreamingDetails.scheduledStartTime
                );
                let weekDay = dueDate.getDay();
                switch (weekDay) {
                  case 0:
                    weekDay = "Dom";
                    break;
                  case 1:
                    weekDay = "Seg";
                    break;
                  case 2:
                    weekDay = "Ter";
                    break;
                  case 3:
                    weekDay = "Qua";
                    break;
                  case 4:
                    weekDay = "Qui";
                    break;
                  case 5:
                    weekDay = "Sex";
                    break;
                  case 6:
                    weekDay = "Sab";
                    break;
                }

                const dueDateComposed = `${weekDay}, ${dueDate
                  .toLocaleDateString()
                  .slice(0, 5)}`;
                const id = item.id;
                document.querySelector("#result").innerHTML += render(
                  title,
                  description,
                  dueDateComposed,
                  id,
                  tags
                );
              });
            },
            function (err) {
              errorMessage("carregar detalhes dos vídeos", err);
            }
          );
      },
      function (err) {
        errorMessage("carregar lista de vídeos", err);
      }
    );
}

const render = (title, description, dueDate, id, tags) => {
  return `<div class="elementor-widget-wrap">
  <section
    class="elementor-section elementor-inner-section elementor-element elementor-element-54035e3d elementor-section-boxed elementor-section-height-default elementor-section-height-default"
    data-id="54035e3d"
    data-element_type="section"
  >
    <div class="elementor-container elementor-column-gap-default">
      <div class="elementor-row">
        <div
          class="elementor-column elementor-col-50 elementor-inner-column elementor-element elementor-element-2a99995d animated-slow animated fadeInLeft"
          data-id="2a99995d"
          data-element_type="column"
          data-settings='{"animation":"fadeInLeft"}'
        >
          <div class="elementor-column-wrap elementor-element-populated">
            <div class="elementor-widget-wrap">
              <div
                class="elementor-element elementor-element-70745d99 elementor-aspect-ratio-169 elementor-widget elementor-widget-video"
                data-id="70745d99"
                data-element_type="widget"
                data-settings='{"aspect_ratio":"169"}'
                data-widget_type="video.default"
              >
                <div class="elementor-widget-container">
                  <div
                    class="elementor-wrapper elementor-fit-aspect-ratio elementor-open-inline"
                  >
                    <iframe
                      class="elementor-video-iframe"
                      allowfullscreen=""
                      title="Player de Vídeo youtube"
                      src="https://www.youtube.com/embed/${id}?feature=oembed&amp;start&amp;end&amp;wmode=opaque&amp;loop=0&amp;controls=1&amp;mute=0&amp;rel=0&amp;modestbranding=0"
                    ></iframe>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          class="elementor-column elementor-col-50 elementor-inner-column elementor-element elementor-element-66b8f60b digital-creative-section animated-slow animated fadeInRight"
          data-id="66b8f60b"
          data-element_type="column"
          data-settings='{"animation":"fadeInRight"}'
        >
          <div class="elementor-column-wrap elementor-element-populated">
            <div class="elementor-widget-wrap">
              <div
                class="elementor-element elementor-element-63c39ed1 who-we-are-box elementor-widget__width-auto elementor-absolute elementor-widget elementor-widget-heading"
                data-id="63c39ed1"
                data-element_type="widget"
                data-settings='{"_position":"absolute"}'
                data-widget_type="heading.default"
              >
                <div class="elementor-widget-container">
                  <h2 class="elementor-heading-title elementor-size-default">
                    ${dueDate}
                  </h2>
                </div>
              </div>
              <div
                class="elementor-element elementor-element-2cd3a90e elementor-widget elementor-widget-heading"
                data-id="2cd3a90e"
                data-element_type="widget"
                data-widget_type="heading.default"
              >
                <div class="elementor-widget-container">
                  <h2 class="elementor-heading-title elementor-size-default">
                    ${title}
                  </h2>
                </div>
              </div>
              <div
                class="elementor-element elementor-element-4c79664f elementor-widget-divider--view-line elementor-widget elementor-widget-divider"
                data-id="4c79664f"
                data-element_type="widget"
                data-widget_type="divider.default"
              >
                <div class="elementor-widget-container">
                  <div class="elementor-divider">
                    <span class="elementor-divider-separator"> </span>
                  </div>
                </div>
              </div>
              <div
                class="elementor-element elementor-element-f84dbc3 elementor-widget elementor-widget-text-editor"
                data-id="f84dbc3"
                data-element_type="widget"
                data-widget_type="text-editor.default"
              >
                <div class="elementor-widget-container">
                  <div class="elementor-text-editor elementor-clearfix">
                    <p>${description}</p>
                  </div>
                  <div
                    class="elementor-element elementor-element-9af246d elementor-widget elementor-widget-heading"
                    data-id="9af246d"
                    data-element_type="widget"
                    data-widget_type="heading.default"
                  >
                    <div class="elementor-widget-container">
                      <h2 class="elementor-heading-title elementor-size-small">
                        ${tags}
                      </h2>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
  <div
    class="elementor-element elementor-element-2fd3f989 animated-fast elementor-widget-divider--view-line elementor-widget elementor-widget-divider animated rotateInUpRight"
    data-id="2fd3f989"
    data-element_type="widget"
    data-settings='{"_animation":"rotateInUpRight"}'
    data-widget_type="divider.default"
  >
    <div class="elementor-widget-container">
      <div class="elementor-divider">
        <span class="elementor-divider-separator"> </span>
      </div>
    </div>
  </div>
</div>
<br /><br />`;
};

function userMenu() {
  var profile = gapi.auth2
    .getAuthInstance()
    .currentUser.get()
    .getBasicProfile();
  const menuMobi = document.querySelector("#gUserMenuMobi");
  const menu = document.querySelector("#gUserMenu");
  menu.innerHTML = `
<img class="userImage" src="${profile.getImageUrl()}"> <span style="
    color: black !important;
    font-weight: bold !important;">Olá, ${profile.getGivenName()} </span>
<a href="#" onclick="logout()"> [Sair] </a>
`;
  menuMobi.innerHTML = `
<span style="
    color: black !important;
    font-weight: bold !important;">Olá, ${profile.getGivenName()} </span>
<a href="#" onclick="logout()"> [Sair] </a>
`;
}

function logout() {
  const instance = gapi.auth2.getAuthInstance();
  instance.signOut();
  const menu = document.querySelector("#gUserMenu");
  menu.innerHTML = `
<div id="gUserMenu">
							<a onclick="authenticate().then(userMenu)"><i class="fas fa-user"></i> Entrar </a>
						</div>
`;
  loadButtons();
}

gapi.load("client:auth2", function () {
  gapi.auth2
    .init({
      client_id: "<YOUR_CLIENT_ID>",
    })
    .then((res) => {
      if (res.isSignedIn.get()) {
        loadClient();
        userMenu();
      } else {
        if (
          window.location.href.includes("com/agenda") ||
          window.location.href.includes("com/vivo")
        ) {
          loadButtons();
        }
      }
    });
});
