const flowerField = document.querySelector("#flower-field");
const flowerLayer = document.querySelector("#flower-layer");
const flowerStatus = document.querySelector("#flower-status");

const flowerPalettes = [
  { petals: "#d99645", center: "#16233e" },
  { petals: "#315b68", center: "#ebd7aa" },
  { petals: "#b94a3d", center: "#ebd7aa" },
  { petals: "#79905f", center: "#d99645" },
  { petals: "#e4c98d", center: "#b94a3d" },
];

let flowerCount = 0;

function createSvgFlower(palette) {
  const namespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(namespace, "svg");
  svg.setAttribute("viewBox", "0 0 64 64");
  svg.setAttribute("focusable", "false");

  const petalGroup = document.createElementNS(namespace, "g");
  petalGroup.setAttribute("fill", palette.petals);
  petalGroup.setAttribute("stroke", "#171814");
  petalGroup.setAttribute("stroke-width", "1.5");

  for (let index = 0; index < 6; index += 1) {
    const petal = document.createElementNS(namespace, "ellipse");
    petal.setAttribute("cx", "32");
    petal.setAttribute("cy", "17");
    petal.setAttribute("rx", "8.5");
    petal.setAttribute("ry", "14");
    petal.setAttribute("transform", `rotate(${index * 60} 32 32)`);
    petalGroup.append(petal);
  }

  const center = document.createElementNS(namespace, "circle");
  center.setAttribute("cx", "32");
  center.setAttribute("cy", "32");
  center.setAttribute("r", "8");
  center.setAttribute("fill", palette.center);
  center.setAttribute("stroke", "#171814");
  center.setAttribute("stroke-width", "1.5");

  svg.append(petalGroup, center);
  return svg;
}

function addFlower(clientX, clientY, isKeyboardAction) {
  const bounds = flowerField.getBoundingClientRect();
  const inset = 28;
  let x = clientX - bounds.left;
  let y = clientY - bounds.top;

  if (isKeyboardAction) {
    const angle = flowerCount * 2.4;
    const radius = Math.min(80, 12 + flowerCount * 4);
    x = bounds.width / 2 + Math.cos(angle) * radius;
    y = bounds.height / 2 + Math.sin(angle) * radius;
  }

  x = Math.max(inset, Math.min(bounds.width - inset, x));
  y = Math.max(inset, Math.min(bounds.height - inset, y));

  const flower = document.createElement("span");
  const palette = flowerPalettes[flowerCount % flowerPalettes.length];
  const size = 30 + ((flowerCount * 7) % 22);

  flower.className = "flower";
  flower.style.left = `${(x / bounds.width) * 100}%`;
  flower.style.top = `${(y / bounds.height) * 100}%`;
  flower.style.setProperty("--flower-size", `${size}px`);
  flower.style.setProperty("--flower-rotation", `${(flowerCount * 29) % 60}deg`);
  flower.append(createSvgFlower(palette));
  flowerLayer.append(flower);

  flowerCount += 1;
  flowerStatus.textContent = `Flower ${flowerCount} added.`;

  if (flowerLayer.children.length > 80) {
    flowerLayer.firstElementChild.remove();
  }
}

flowerField.addEventListener("click", (event) => {
  addFlower(event.clientX, event.clientY, event.detail === 0);
});
