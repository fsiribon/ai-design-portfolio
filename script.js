const birdField = document.querySelector("#bird-field");
const birdLayer = document.querySelector("#bird-layer");
const birdStatus = document.querySelector("#bird-status");

const birdPalettes = [
  { primary: "#6935c6", secondary: "#ff6f61", body: "#25173c" },
  { primary: "#ff7a59", secondary: "#ffc34d", body: "#4a246f" },
  { primary: "#8358de", secondary: "#ff9c73", body: "#2a1b45" },
  { primary: "#315b68", secondary: "#ef9a5b", body: "#16233e" },
];

let birdCount = 0;

function createSvgBird(palette) {
  const namespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(namespace, "svg");
  svg.setAttribute("viewBox", "0 0 88 56");
  svg.setAttribute("focusable", "false");

  const leftWing = document.createElementNS(namespace, "path");
  leftWing.setAttribute("class", "bird-wing bird-wing--left");
  leftWing.setAttribute("d", "M42 29C31 5 9 5 5 15c12 1 19 10 25 22Z");
  leftWing.setAttribute("fill", palette.primary);

  const rightWing = document.createElementNS(namespace, "path");
  rightWing.setAttribute("class", "bird-wing bird-wing--right");
  rightWing.setAttribute("d", "M46 29C57 5 79 5 83 15 71 16 64 25 58 37Z");
  rightWing.setAttribute("fill", palette.secondary);

  const body = document.createElementNS(namespace, "path");
  body.setAttribute("d", "M34 28c0-8 5-14 10-14s10 6 10 14c0 10-5 19-10 24-5-5-10-14-10-24Z");
  body.setAttribute("fill", palette.body);

  const beak = document.createElementNS(namespace, "path");
  beak.setAttribute("d", "m44 14 5-5-2 7Z");
  beak.setAttribute("fill", "#ffcc56");

  const eye = document.createElementNS(namespace, "circle");
  eye.setAttribute("cx", "46");
  eye.setAttribute("cy", "18");
  eye.setAttribute("r", "1.3");
  eye.setAttribute("fill", "#fff9ef");

  svg.append(leftWing, rightWing, body, beak, eye);
  return svg;
}

function addBird(clientX, clientY, isKeyboardAction) {
  const bounds = birdField.getBoundingClientRect();
  const inset = 34;
  let x = clientX - bounds.left;
  let y = clientY - bounds.top;

  if (isKeyboardAction) {
    const angle = birdCount * 2.2;
    const radius = Math.min(90, 18 + birdCount * 5);
    x = bounds.width / 2 + Math.cos(angle) * radius;
    y = bounds.height / 2 + Math.sin(angle) * radius;
  }

  x = Math.max(inset, Math.min(bounds.width - inset, x));
  y = Math.max(inset, Math.min(bounds.height - inset, y));

  const bird = document.createElement("span");
  const palette = birdPalettes[birdCount % birdPalettes.length];
  const size = 56 + ((birdCount * 9) % 30);

  bird.className = "bird";
  bird.style.left = `${(x / bounds.width) * 100}%`;
  bird.style.top = `${(y / bounds.height) * 100}%`;
  bird.style.setProperty("--bird-size", `${size}px`);
  bird.style.setProperty("--bird-tilt", `${-8 + ((birdCount * 7) % 17)}deg`);
  bird.style.setProperty("--wing-speed", `${520 + ((birdCount * 43) % 240)}ms`);
  bird.append(createSvgBird(palette));
  birdLayer.append(bird);

  birdCount += 1;
  birdStatus.textContent = `Bird ${birdCount} released.`;

  if (birdLayer.children.length > 60) {
    birdLayer.firstElementChild.remove();
  }
}

birdField.addEventListener("click", (event) => {
  addBird(event.clientX, event.clientY, event.detail === 0);
});
