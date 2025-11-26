const mineflayer = require("mineflayer");
const readline = require("readline");
const Vec3 = require("vec3");
const fs = require("fs");

// Ivan Dimkov

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const userData = fs.readFileSync("user.txt", "utf8");
const lines = userData.split("\n");
const username = lines[0].split(":")[1].trim();
const password = lines[1].split(":")[1].trim();

const bot = mineflayer.createBot({
  host: "jartex.fun",
  port: 25565,
  username: username,
  version: "1.18.2",
});

bot.setMaxListeners(50);
bot._client.setMaxListeners(50);
require("events").EventEmitter.defaultMaxListeners = 50;
if (bot._client) bot._client.setMaxListeners(50);

bot.once("spawn", () => {
  console.log("enter");
  bot.chat(`/l ${password}`);
  setTimeout(() => {
    bot.chat("/server immortal");
  }, 2000);
});

bot.on("error", (err) => console.log(err));

let hoverInterval = null;
let foundSpots = [];
let currentSpotAttempts = 0;

function enablefly() {
  const startY = bot.entity.position.y;
  const targetHeight = 6;
  if (hoverInterval) {
    clearInterval(hoverInterval);
    hoverInterval = null;
  }
  bot.setControlState("jump", true);
  setTimeout(() => {
    bot.setControlState("jump", false);
    setTimeout(() => {
      bot.setControlState("jump", true);
      setTimeout(() => {
        bot.setControlState("jump", false);
        bot.setControlState("sneak", true);
        bot.entity.gravity = 0;
        bot.entity.velocity.y = 0;
        hoverInterval = setInterval(() => {
          bot.entity.gravity = 0;
          bot.entity.velocity.y = 0;
          if (bot.entity.position.y < startY + targetHeight - 1) {
            bot.entity.velocity.y = 0.1;
          } else {
            bot.entity.velocity.y = 0;
          }
        }, 100);
      }, 100);
    }, 300);
  }, 100);
}

function moveposition(pos, callback) {
  if (hoverInterval) {
    clearInterval(hoverInterval);
    hoverInterval = null;
  }
  bot.setControlState("sneak", true);
  const moveInterval = setInterval(() => {
    const distance = bot.entity.position.distanceTo(pos);
    if (distance < 1.5) {
      clearInterval(moveInterval);
      bot.entity.velocity.x = 0;
      bot.entity.velocity.z = 0;
      bot.entity.velocity.y = 0;
      hoverInterval = setInterval(() => {
        bot.entity.velocity.y = 0;
      }, 50);
      callback();
    } else {
      const direction = pos.minus(bot.entity.position).normalize();
      const baseSpeed = 0.28;
      const speed = Math.min(distance * 0.3, baseSpeed);
      bot.entity.velocity.x = direction.x * speed;
      bot.entity.velocity.z = direction.z * speed;
      bot.entity.velocity.y = direction.y * speed;
      const newPos = bot.entity.position.plus(direction.scaled(speed * 0.05));
      bot.entity.position.x = newPos.x;
      bot.entity.position.y = newPos.y;
      bot.entity.position.z = newPos.z;
    }
  }, 50);
}

function checkplaces(direction) {
  const pos = bot.entity.position.floored();
  let directionOffset = new Vec3(0, 0, 0);
  let reverseOffset = new Vec3(0, 0, 0);
  let scanWidth = false;
  switch (direction.toLowerCase()) {
    case "north":
      directionOffset = new Vec3(0, 0, -1);
      reverseOffset = new Vec3(0, 0, 1);
      scanWidth = true;
      break;
    case "south":
      directionOffset = new Vec3(0, 0, 1);
      reverseOffset = new Vec3(0, 0, -1);
      scanWidth = true;
      break;
    case "east":
      directionOffset = new Vec3(1, 0, 0);
      reverseOffset = new Vec3(-1, 0, 0);
      scanWidth = false;
      break;
    case "west":
      directionOffset = new Vec3(-1, 0, 0);
      reverseOffset = new Vec3(1, 0, 0);
      scanWidth = false;
      break;
    default:
      return;
  }

  const frontPositions = [];
  const checkDistance = 128;
  const yRange = 64;
  const widthRange = 64;

  for (let i = 1; i <= checkDistance; i++) {
    for (let yOffset = -yRange; yOffset <= yRange; yOffset++) {
      for (let wOffset = -widthRange; wOffset <= widthRange; wOffset++) {
        let checkPos;
        if (scanWidth) {
          checkPos = pos
            .plus(directionOffset.scaled(i))
            .offset(wOffset, yOffset, 0);
        } else {
          checkPos = pos
            .plus(directionOffset.scaled(i))
            .offset(0, yOffset, wOffset);
        }
        const block = bot.blockAt(checkPos);
        if (block && block.name === "slime_block") {
          const frontPos = checkPos.plus(reverseOffset);
          const frontBlock = bot.blockAt(frontPos);
          if (
            frontBlock &&
            (frontBlock.name === "air" || frontBlock.name === "cave_air")
          ) {
            frontPositions.push({
              target: frontPos,
              slimeBlock: checkPos,
            });
          }
        }
        if (frontPositions.length >= 500) {
          break;
        }
      }
      if (frontPositions.length >= 500) break;
    }
    if (frontPositions.length >= 500) break;
  }
  console.log(`=== ${frontPositions.length}`);
  if (frontPositions.length > 0) {
    foundSpots = frontPositions.sort((a, b) => a.target.y - b.target.y);
    buyspawners();
    setTimeout(() => {
      enablefly();
      setTimeout(() => {
        dropDown();
      }, 2000);
    }, 3000);
  }
}

function dropDown() {
  if (foundSpots.length === 0) {
    return;
  }

  const lowestSpot = foundSpots[0];
  const slimePos = lowestSpot.slimeBlock;
  const targetPos = lowestSpot.target;

  let standingPos;
  if (slimePos.x < targetPos.x) {
    standingPos = new Vec3(targetPos.x + 3, targetPos.y, targetPos.z);
  } else if (slimePos.x > targetPos.x) {
    standingPos = new Vec3(targetPos.x - 3, targetPos.y, targetPos.z);
  } else if (slimePos.z < targetPos.z) {
    standingPos = new Vec3(targetPos.x, targetPos.y, targetPos.z + 3);
  } else if (slimePos.z > targetPos.z) {
    standingPos = new Vec3(targetPos.x, targetPos.y, targetPos.z - 3);
  }

  moveposition(standingPos, async () => {
    currentSpotAttempts = 0;
    lastSpawnerCount = spawnernumber();
    currentHotbarSlot = 0;
    await refillhotbar();
    aimatplace(slimePos, targetPos, true);
  });
}

function spawnernumber() {
  const spawners = bot.inventory
    .items()
    .filter(
      (item) =>
        item.name.includes("spawner") ||
        item.displayName?.toLowerCase().includes("spawner")
    );
  return spawners.reduce((total, item) => total + item.count, 0);
}

let currentHotbarSlot = 0;

function isspawner(item) {
  if (!item) return false;
  return (
    item.name.includes("spawner") ||
    item.displayName?.toLowerCase().includes("spawner")
  );
}

async function refillhotbar() {
  const inventorySpawners = bot.inventory.items().filter((item) => {
    return isspawner(item) && item.slot < 36;
  });

  if (inventorySpawners.length === 0) {
    return false;
  }

  let moved = 0;
  for (let hotbarSlot = 0; hotbarSlot < 9; hotbarSlot++) {
    const slot = 36 + hotbarSlot;
    const currentItem = bot.inventory.slots[slot];
    if (!currentItem || !isspawner(currentItem)) {
      if (inventorySpawners.length > 0) {
        const spawnerToMove = inventorySpawners.shift();
        try {
          await bot.moveSlotItem(spawnerToMove.slot, slot);
          moved++;
          await new Promise((resolve) => setTimeout(resolve, 50));
        } catch (error) {}
      }
    }
  }
  return moved > 0;
}

async function checkspawnerspots() {
  const slot = 36 + currentHotbarSlot;
  const item = bot.inventory.slots[slot];
  if (item && isspawner(item)) {
    bot.setQuickBarSlot(currentHotbarSlot);
    await new Promise((resolve) => setTimeout(resolve, 80));
    return true;
  }
  const inventorySpawner = bot.inventory.items().find((item) => {
    return isspawner(item) && item.slot < 36;
  });
  if (!inventorySpawner) {
    return false;
  }
  try {
    await bot.moveSlotItem(inventorySpawner.slot, slot);
    await new Promise((resolve) => setTimeout(resolve, 80));
    bot.setQuickBarSlot(currentHotbarSlot);
    await new Promise((resolve) => setTimeout(resolve, 80));
    return true;
  } catch (error) {
    return false;
  }
}

async function aimatplace(slimePos, targetPos, isFirstPlacement = true) {
  const hasSpawner = await checkspawnerspots();
  if (!hasSpawner) {
    const filled = await refillhotbar();
    if (filled) {
      currentHotbarSlot = 0;
      setTimeout(() => aimatplace(slimePos, targetPos, isFirstPlacement), 100);
    } else {
      buyspawners();
      setTimeout(async () => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await refillhotbar();
        currentHotbarSlot = 0;
        aimatplace(slimePos, targetPos, isFirstPlacement);
      }, 3000);
    }
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, 20));

  if (!isspawner(bot.heldItem)) {
    currentHotbarSlot = (currentHotbarSlot + 1) % 9;
    setTimeout(() => aimatplace(slimePos, targetPos, isFirstPlacement), 30);
    return;
  }
  const targetBlockPos = isFirstPlacement ? slimePos : targetPos;
  const referenceBlock = bot.blockAt(targetBlockPos);
  if (!referenceBlock) {
    currentHotbarSlot = (currentHotbarSlot + 1) % 9;
    setTimeout(() => aimatplace(slimePos, targetPos, isFirstPlacement), 30);
    return;
  }

  const lookPos = new Vec3(
    targetBlockPos.x + 0.5,
    targetBlockPos.y + 0.5,
    targetBlockPos.z + 0.5
  );

  await bot.lookAt(lookPos);
  await new Promise((resolve) => setTimeout(resolve, 30));

  let faceVector;
  const botPos = bot.entity.position.floored();
  const direction = targetBlockPos.minus(botPos);
  if (Math.abs(direction.x) > Math.abs(direction.z)) {
    faceVector = direction.x > 0 ? new Vec3(-1, 0, 0) : new Vec3(1, 0, 0);
  } else {
    faceVector = direction.z > 0 ? new Vec3(0, 0, -1) : new Vec3(0, 0, 1);
  }
  const countBefore = spawnernumber();
  try {
    bot.placeBlock(referenceBlock, faceVector).catch(() => {});
  } catch (error) {}

  await new Promise((resolve) => setTimeout(resolve, 100));
  const countAfter = spawnernumber();

  if (countAfter < countBefore) {
    currentSpotAttempts = 0;
  } else {
    currentSpotAttempts++;
    await new Promise((resolve) => setTimeout(resolve, 100));
    const finalCount = spawnernumber();
    if (finalCount < countBefore) {
      currentSpotAttempts = 0;
    } else if (finalCount === countBefore) {
      if (currentSpotAttempts >= 3) {
        foundSpots.shift();
        currentSpotAttempts = 0;
        currentHotbarSlot = 0;
        if (foundSpots.length > 0) {
          setTimeout(() => dropDown(), 250);
        } else {
          console.log("done");
        }
        return;
      }
    }
  }
  currentHotbarSlot = (currentHotbarSlot + 1) % 9;
  if (currentHotbarSlot === 0) {
    await refillhotbar();
  }
  setTimeout(() => {
    aimatplace(slimePos, targetPos, false);
  }, 50);
}

function buyspawners() {
  bot.chat("/shop");
  let currentStep = 0;
  const steps = [24, 25, 31, 22];
  let windowListener;
  function nextstep() {
    if (currentStep < steps.length) {
      bot.clickWindow(steps[currentStep], 0, 0);
      currentStep++;
    } else {
      bot.removeListener("windowOpen", windowListener);
      bot.closeWindow(bot.currentWindow);
    }
  }
  windowListener = () => {
    setTimeout(nextstep, 100);
  };
  bot.on("windowOpen", windowListener);
  setTimeout(nextstep, 1000);
}

rl.on("line", (input) => {
  if (input.startsWith(".s ")) {
    bot.chat(input.slice(3));
  } else if (input.startsWith(".check ")) {
    checkplaces(input.slice(7).trim());
  }
});
