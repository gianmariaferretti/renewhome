(() => {
  "use strict";

  const STORAGE_KEY = "renew-home-prototype-state";

  const app = document.getElementById("app");
  const toast = document.getElementById("toast");

  const rewardCatalog = {
    bill: {
      title: "Bill credit",
      subtitle: "Instant",
      icon: "💵",
      cost: 1480,
      label: "$14.80",
      type: "credit"
    },
    gift: {
      title: "Gift cards",
      subtitle: "Amazon, Target...",
      icon: "🎁",
      cost: 1000,
      label: "1,000 pt",
      type: "points"
    },
    trees: {
      title: "Plant trees",
      subtitle: "One Tree Planted",
      icon: "🌳",
      cost: 500,
      label: "500 pt",
      type: "impact"
    }
  };

  const preferenceCopy = {
    save: "Max rewards",
    balanced: "Comfort + savings",
    comfort: "Subtle shifts"
  };

  const navItems = [
    { view: "home", icon: "⌂", label: "Home" },
    { view: "events", icon: "ϟ", label: "Events" },
    { view: "rewards", icon: "☆", label: "Rewards" },
    { view: "impact", icon: "⌁", label: "Impact" }
  ];

  function makeInitialState() {
    const totalSeconds = 2 * 60 * 60 + 14 * 60;
    return {
      view: "welcome",
      onboarded: false,
      user: { name: "Maya", initials: "MR" },
      connectedDevices: ["thermostat"],
      comfortTemp: 76,
      preference: "save",
      saved: 142.6,
      points: 1480,
      rewardToday: 18,
      rewardTodayPoints: 240,
      kwhShiftedToday: 3.1,
      weeklyImpact: [21, 34, 25, 42, 31, 49, 39],
      currentTemp: 72,
      co2Avoided: 312,
      trees: 6,
      neighborhoodMwh: 1.2,
      eventActive: true,
      eventCompleted: false,
      eventOptedOut: false,
      eventTotalSeconds: totalSeconds,
      eventEndsAt: Date.now() + totalSeconds * 1000,
      eventStartedAt: Date.now() - 26 * 60 * 1000,
      energyShiftCount: 38,
      redeemedRewards: [],
      invitedNeighbors: 0
    };
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || typeof saved !== "object") return makeInitialState();
      return { ...makeInitialState(), ...saved };
    } catch (error) {
      return makeInitialState();
    }
  }

  let state = loadState();
  let toastTimer = null;
  let lastRenderedMinute = null;

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function resetDemo() {
    localStorage.removeItem(STORAGE_KEY);
    state = makeInitialState();
    lastRenderedMinute = null;
    render();
    showToast("Demo reset. Start again from onboarding.");
  }

  function currency(value) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
  }

  function number(value) {
    return new Intl.NumberFormat("en-US").format(value);
  }

  function roundMoney(value) {
    return Math.round(value * 100) / 100;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function eventRemainingSeconds() {
    if (!state.eventActive) return 0;
    const remaining = Math.max(0, Math.floor((state.eventEndsAt - Date.now()) / 1000));
    if (remaining === 0) completeEvent();
    return remaining;
  }

  function completeEvent() {
    if (!state.eventActive) return;
    state.eventActive = false;
    state.eventCompleted = true;
    state.eventOptedOut = false;
    state.points += 160;
    state.saved = roundMoney(state.saved + 5.8);
    state.co2Avoided += 18;
    state.energyShiftCount += 1;
    saveState();
  }

  function formatDuration(seconds) {
    const safeSeconds = Math.max(0, seconds);
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    if (hours <= 0) return `${minutes}m`;
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }

  function eventProgressPercent() {
    if (!state.eventActive && state.eventCompleted) return 100;
    const remaining = eventRemainingSeconds();
    const elapsed = state.eventTotalSeconds - remaining;
    return clamp(Math.round((elapsed / state.eventTotalSeconds) * 100), 0, 100);
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
  }

  function statusbar(dark = false) {
    return `
      <div class="statusbar ${dark ? "dark" : ""}">
        <span>9:41</span>
        <span class="icons" aria-hidden="true"><span class="signal">▥</span><span>▰</span><span class="battery">▱</span></span>
      </div>
    `;
  }

  function bottomNav(activeView) {
    return `
      <nav class="bottom-nav" aria-label="Main navigation">
        ${navItems
          .map(
            (item) => `
              <button type="button" class="nav-item ${activeView === item.view ? "active" : ""}" data-nav="${item.view}" aria-label="${item.label}">
                <span class="nav-icon" aria-hidden="true">${item.icon}</span>
                <span>${item.label}</span>
              </button>
            `
          )
          .join("")}
      </nav>
    `;
  }

  function renderWelcome() {
    return `
      <section class="screen welcome">
        ${statusbar(true)}
        <div class="hero">
          <span class="kicker">⚡ Largest residential VPP in the US</span>
          <h1>Turn your home into savings.</h1>
          <p>Earn rewards for letting Renew Home gently shift your energy use when the grid needs it most — you stay in control, always.</p>
        </div>
        <div class="welcome-cta">
          <button type="button" class="primary wide" data-action="start-onboarding">Get started →</button>
          <button type="button" class="secondary wide" data-action="sign-in">I already have an account</button>
        </div>
      </section>
    `;
  }

  function renderConnectDevice() {
    const devices = [
      { id: "thermostat", icon: "🌡️", title: "Nest Thermostat", subtitle: "Living room · detected" },
      { id: "water", icon: "💧", title: "Smart Water Heater", subtitle: "Add later" },
      { id: "battery", icon: "🔋", title: "Home Battery / EV", subtitle: "Add later" }
    ];

    return `
      <section class="screen setup">
        ${statusbar(false)}
        <div class="content">
          <h1 class="app-title">Connect a device</h1>
          <p class="subtle">Renew Home works with the smart devices you already own. Connect one to begin.</p>
          <div class="device-list">
            ${devices
              .map((device) => {
                const selected = state.connectedDevices.includes(device.id);
                return `
                  <button type="button" class="device-card ${selected ? "selected" : ""}" data-device="${device.id}" aria-pressed="${selected}">
                    <span class="device-icon" aria-hidden="true">${device.icon}</span>
                    <span>
                      <h3>${device.title}</h3>
                      <p>${device.subtitle}</p>
                    </span>
                    <span class="checkmark" aria-hidden="true">${selected ? "✓" : ""}</span>
                  </button>
                `;
              })
              .join("")}
          </div>
          <div class="security-note">
            <span class="lock" aria-hidden="true">🔒</span>
            <span>We never control your home without your limits. You can pause or opt out of any event, anytime.</span>
          </div>
        </div>
        <div class="bottom-fixed">
          <button type="button" class="primary wide" data-action="continue-comfort" ${state.connectedDevices.length === 0 ? "disabled" : ""}>Continue →</button>
        </div>
      </section>
    `;
  }

  function renderComfort() {
    const prefs = [
      { id: "save", icon: "💰", title: "Save the most", subtitle: "Max rewards" },
      { id: "balanced", icon: "⚖️", title: "Balanced", subtitle: "Comfort + savings" },
      { id: "comfort", icon: "🛋️", title: "Comfort first", subtitle: "Subtle shifts" }
    ];

    return `
      <section class="screen setup">
        ${statusbar(false)}
        <div class="content">
          <h1 class="app-title">Set your comfort</h1>
          <p class="subtle">During an Energy Shift we'll never push past your limits. You're in charge.</p>

          <div class="slider-card">
            <div class="slider-labels">
              <span>Max temp on a hot day</span>
              <strong data-temp-value>${state.comfortTemp}°F</strong>
            </div>
            <input id="tempRange" class="temp-range" type="range" min="68" max="80" value="${state.comfortTemp}" aria-label="Maximum temperature on a hot day" />
            <div class="slider-endpoints">
              <span>68° cooler</span>
              <span>80° warmer</span>
            </div>
          </div>

          <h2 class="section-title" style="margin-top: 18px;">What matters most to you?</h2>
          <div class="preference-grid">
            ${prefs
              .map(
                (pref) => `
                  <button type="button" class="preference-card ${state.preference === pref.id ? "selected" : ""}" data-pref="${pref.id}" aria-pressed="${state.preference === pref.id}">
                    <span aria-hidden="true">${pref.icon}</span>
                    <strong>${pref.title}</strong>
                    <span>${pref.subtitle}</span>
                  </button>
                `
              )
              .join("")}
          </div>

          <div class="explain-card">
            <h3>How Energy Shifts work</h3>
            <p>When the grid is strained, we pre-cool your home, then ease off during peak hours. You barely notice — and you earn rewards for the energy you shift.</p>
          </div>
        </div>
        <div class="bottom-fixed">
          <button type="button" class="primary wide" data-action="start-saving">Start saving</button>
        </div>
      </section>
    `;
  }

  function renderHome() {
    const statusLabel = state.eventOptedOut ? "Paused" : state.eventCompleted ? "Completed" : "Optimized";
    const activeAlert = state.eventActive;
    return `
      <section class="screen main-screen">
        ${statusbar(false)}
        <div class="content">
          <div class="header-row">
            <div>
              <span class="subtle" style="margin:0; display:block;">Good afternoon,</span>
              <h1 class="app-title">${escapeHtml(state.user.name)} 👋</h1>
            </div>
            <div class="avatar" aria-label="User initials">${escapeHtml(state.user.initials)}</div>
          </div>

          <section class="home-hero" aria-label="Savings summary">
            <p class="eyebrow">Saved this summer</p>
            <strong class="big-money">${currency(state.saved)}</strong>
            <span class="hero-note">+ ${number(state.points)} reward points · ${state.energyShiftCount} Energy Shifts</span>
          </section>

          <button type="button" class="energy-alert wide" data-action="open-event">
            <span aria-hidden="true">⚡</span>
            <span>
              <strong>${activeAlert ? "Energy Shift today · 4–8 PM" : state.eventCompleted ? "Energy Shift completed" : "Next Energy Shift tomorrow"}</strong>
              <span>${activeAlert ? "Grid demand is high. Tap to see your plan." : state.eventOptedOut ? "You opted out. You can rejoin from Events." : "Rewards have been added to your balance."}</span>
            </span>
            <span class="chev" aria-hidden="true">›</span>
          </button>

          <div class="home-grid">
            <div class="home-small-card">
              <span>Home status</span>
              <strong>${statusLabel}</strong>
            </div>
            <div class="home-small-card">
              <span>Now</span>
              <strong>${state.currentTemp}°F</strong>
            </div>
          </div>

          <section class="history-card">
            <div class="history-head">
              <h3>This week's impact</h3>
              <span class="trend">▲ 12%</span>
            </div>
            <div class="bar-chart" aria-label="Weekly kWh shifted chart">
              ${state.weeklyImpact
                .map((height, index) => {
                  const days = ["M", "T", "W", "T", "F", "S", "S"];
                  return `<span class="bar" style="height:${height + 18}%" data-day="${days[index]}" title="${height} kWh shifted"></span>`;
                })
                .join("")}
            </div>
            <p class="chart-caption">kWh shifted · Mon–Sun</p>
          </section>
        </div>
        ${bottomNav("home")}
      </section>
    `;
  }

  function renderEventActive() {
    const remaining = eventRemainingSeconds();
    const progress = eventProgressPercent();
    const earnedNow = state.eventOptedOut ? 0 : state.eventCompleted ? 8.0 : 6.4 + progress / 100;
    const pointsNow = state.eventOptedOut ? 0 : state.eventCompleted ? 120 : 90 + Math.floor(progress / 3);

    return `
      <section class="screen event-screen">
        ${statusbar(true)}
        <div class="content">
          <div class="header-row">
            <button type="button" class="back-button" data-action="go-home" aria-label="Back">‹</button>
            <span></span>
          </div>

          <span class="event-progress-pill">⚡ ${state.eventActive ? "Energy Shift in progress" : state.eventCompleted ? "Energy Shift complete" : "Energy Shift paused"}</span>
          <h1>Peak hours · 4–8 PM</h1>
          <p class="event-copy">${state.eventActive ? `We pre-cooled your home to 70°. Now easing off to support the grid.` : state.eventCompleted ? `Great job. Your shifted energy helped support the grid during peak hours.` : `You are opted out of this event. Your comfort settings remain unchanged.`}</p>

          <div class="ring" style="--progress:${progress}%" aria-label="Energy shift progress">
            <div class="ring-content">
              <strong>${state.eventActive ? formatDuration(remaining) : "Done"}</strong>
              <span>${state.eventActive ? "remaining" : state.eventCompleted ? "completed" : "paused"}</span>
            </div>
          </div>

          <div class="event-metric">
            <span>Comfort<strong>${state.eventOptedOut ? "Manual mode" : `Holding at ${Math.min(state.comfortTemp - 2, 74)}°F`}</strong></span>
            <span class="metric-icon" aria-hidden="true">☺️</span>
          </div>
          <div class="event-metric">
            <span>Earning right now<strong>+${currency(earnedNow)} · ${pointsNow} pts</strong></span>
            <span class="metric-icon" aria-hidden="true">💰</span>
          </div>

          ${state.eventActive ? `<h2 class="section-title" style="color: rgba(255,255,255,.7); margin-top: 18px;">Too warm? You're in control.</h2>
          <div class="event-actions">
            <button type="button" class="primary" data-action="stay-in">Stay in — I'm comfy</button>
            <button type="button" class="danger" data-action="opt-out">Opt out</button>
          </div>` : `<button type="button" class="light-button wide" data-action="go-rewards" style="margin-top: 18px;">See my reward →</button>`}
        </div>
        <div class="bottom-fixed">
          <button type="button" class="primary wide" data-action="go-rewards">See my reward →</button>
        </div>
      </section>
    `;
  }

  function renderRewards() {
    const redeemed = new Set(state.redeemedRewards);
    return `
      <section class="screen main-screen">
        ${statusbar(false)}
        <div class="content">
          <h1 class="app-title">Rewards</h1>
          <section class="rewards-hero" aria-label="Rewards earned today">
            <div>
              <p class="eyebrow">Earned today</p>
              <strong class="big-money">${currency(state.rewardToday)}</strong>
              <span class="hero-note">+ ${number(state.rewardTodayPoints)} points · ${state.kwhShiftedToday.toFixed(1)} kWh shifted</span>
            </div>
          </section>

          <div class="reward-section-header">
            <span>Redeem your ${number(state.points)} points</span>
          </div>
          <div class="reward-list">
            ${Object.entries(rewardCatalog)
              .map(([id, reward]) => {
                const isRedeemed = redeemed.has(id);
                const disabled = isRedeemed || state.points < reward.cost;
                return `
                  <button type="button" class="reward-row ${isRedeemed ? "redeemed" : ""}" data-reward="${id}" ${disabled ? "disabled" : ""}>
                    <span class="reward-icon" aria-hidden="true">${reward.icon}</span>
                    <span>
                      <h3>${reward.title}</h3>
                      <p>${isRedeemed ? "Redeemed" : reward.subtitle}</p>
                    </span>
                    <span class="cost">${isRedeemed ? "✓" : reward.label}</span>
                  </button>
                `;
              })
              .join("")}
          </div>
        </div>
        ${bottomNav("rewards")}
      </section>
    `;
  }

  function renderImpact() {
    const leaderboard = [
      { rank: 1, icon: "🏆", name: "The Garcias", kwh: 214 },
      { rank: 2, icon: "🏡", name: "Patel family", kwh: 198 },
      { rank: 3, icon: state.user.initials, name: `You (${state.user.name})`, kwh: 186, you: true },
      { rank: 4, icon: "🏠", name: "Chen household", kwh: 155 }
    ];

    return `
      <section class="screen main-screen">
        ${statusbar(false)}
        <div class="content">
          <h1 class="app-title">Your impact</h1>
          <div class="impact-grid">
            <div class="impact-top-card">
              <span>CO₂ avoided</span>
              <strong>${number(state.co2Avoided)} lbs</strong>
            </div>
            <div class="impact-top-card">
              <span>= Trees</span>
              <strong>🌳 ${number(state.trees)}</strong>
            </div>
          </div>

          <section class="neighborhood-card">
            <p class="eyebrow">Maple Street neighborhood</p>
            <h3>Together you shifted ${state.neighborhoodMwh.toFixed(1)} MWh this month ⚡</h3>
            <p>That's enough to power 40 homes for a day.</p>
          </section>

          <h2 class="section-title">Neighborhood leaderboard</h2>
          <div class="leaderboard">
            ${leaderboard
              .map(
                (person) => `
                  <div class="leader-row ${person.you ? "you" : ""}">
                    <span class="leader-rank">${person.rank}</span>
                    <span class="leader-icon">${escapeHtml(person.icon)}</span>
                    <span class="leader-name">${escapeHtml(person.name)}</span>
                    <span class="leader-kwh">${person.kwh} kWh</span>
                  </div>
                `
              )
              .join("")}
          </div>

          <button type="button" class="primary wide impact-share-button" data-action="open-share">📣 Share my impact</button>
        </div>
        ${bottomNav("impact")}
      </section>
    `;
  }

  function renderEvents() {
    const remaining = eventRemainingSeconds();
    return `
      <section class="screen main-screen">
        ${statusbar(false)}
        <div class="content">
          <div class="header-row">
            <div>
              <h1 class="app-title">Energy Shifts</h1>
              <p class="subtle" style="margin-bottom:0;">Automatic peak-hour savings with comfort limits.</p>
            </div>
            <button type="button" class="icon-button light" data-action="open-event" aria-label="Open active event">⚡</button>
          </div>

          <div class="event-list">
            <section class="event-card active">
              <div class="event-card-top">
                <div>
                  <h3>Today · 4–8 PM</h3>
                  <p>${state.eventActive ? `${formatDuration(remaining)} remaining · ${preferenceCopy[state.preference]}` : state.eventOptedOut ? "Opted out · manual mode" : "Completed · reward ready"}</p>
                </div>
                <span class="small-pill">${state.eventActive ? "Live" : state.eventCompleted ? "Done" : "Paused"}</span>
              </div>
              <p>Renew Home pre-cools before demand spikes, then eases off during the grid-stress window.</p>
              <div class="event-card-actions">
                <button type="button" class="primary" data-action="open-event">View plan</button>
                ${state.eventActive ? `<button type="button" class="ghost" data-action="opt-out">Opt out</button>` : `<button type="button" class="ghost" data-action="rejoin-event">Rejoin</button>`}
              </div>
            </section>

            <section class="event-card">
              <div class="event-card-top">
                <div>
                  <h3>Tomorrow · 5–7 PM</h3>
                  <p>Estimated +$3.20 · 55 pts</p>
                </div>
                <span class="small-pill">Planned</span>
              </div>
              <p>Based on forecasted demand and your comfort limit of ${state.comfortTemp}°F.</p>
            </section>

            <section class="info-card">
              <h3>You always stay in control</h3>
              <p>Pause, opt out or change your comfort limit at any time. Renew Home only shifts within the settings you approve.</p>
            </section>
          </div>
        </div>
        ${bottomNav("events")}
      </section>
    `;
  }

  function renderShare() {
    return `
      <section class="screen share-screen">
        ${statusbar(true)}
        <div class="content">
          <div class="header-row">
            <button type="button" class="back-button" data-action="go-impact" aria-label="Back">‹</button>
            <span></span>
          </div>

          <section class="share-card" aria-label="Impact card">
            <div class="avatar">${escapeHtml(state.user.initials)}</div>
            <span>${escapeHtml(state.user.name)}'s summer with Renew Home</span>
            <h1>${currency(state.saved).replace("$", "$")}</h1>
            <p>saved · ${number(state.co2Avoided)} lbs CO₂ avoided</p>
            <p>“I lowered my bill without lifting a finger — and helped keep the lights on for Texas.” 💚</p>
          </section>

          <p class="subtle" style="color:rgba(255,255,255,.72); margin: 19px 6px 0; text-align:center;">Refer a neighbor — you both get $25 when they enroll.</p>
          <div class="share-actions">
            <button type="button" class="primary wide" data-action="invite-neighbor">Invite neighbors</button>
            <button type="button" class="ghost wide" data-action="share-impact">Share my impact card</button>
            <button type="button" class="restart" data-action="reset-demo">↺ Restart prototype</button>
          </div>
        </div>
      </section>
    `;
  }

  function render() {
    const views = {
      welcome: renderWelcome,
      connect: renderConnectDevice,
      comfort: renderComfort,
      home: renderHome,
      event: renderEventActive,
      events: renderEvents,
      rewards: renderRewards,
      impact: renderImpact,
      share: renderShare
    };

    const renderView = views[state.view] || renderWelcome;
    app.innerHTML = renderView();
  }

  function goTo(view) {
    state.view = view;
    saveState();
    render();
  }

  function toggleDevice(deviceId) {
    const devices = new Set(state.connectedDevices);
    if (devices.has(deviceId)) devices.delete(deviceId);
    else devices.add(deviceId);
    state.connectedDevices = Array.from(devices);
    saveState();
    render();
  }

  function redeemReward(id) {
    const reward = rewardCatalog[id];
    if (!reward) return;
    if (state.redeemedRewards.includes(id)) {
      showToast("Already redeemed.");
      return;
    }
    if (state.points < reward.cost) {
      showToast("Not enough points yet.");
      return;
    }

    state.points -= reward.cost;
    state.redeemedRewards.push(id);

    if (reward.type === "credit") state.saved = roundMoney(state.saved + 14.8);
    if (reward.type === "impact") {
      state.trees += 1;
      state.co2Avoided += 48;
    }

    saveState();
    render();
    showToast(`${reward.title} redeemed successfully.`);
  }

  function optOut() {
    state.eventActive = false;
    state.eventOptedOut = true;
    state.eventCompleted = false;
    state.currentTemp = state.comfortTemp;
    saveState();
    render();
    showToast("Energy Shift paused. You can rejoin from Events.");
  }

  function rejoinEvent() {
    const totalSeconds = 2 * 60 * 60;
    state.eventActive = true;
    state.eventCompleted = false;
    state.eventOptedOut = false;
    state.eventTotalSeconds = totalSeconds;
    state.eventEndsAt = Date.now() + totalSeconds * 1000;
    state.eventStartedAt = Date.now();
    state.currentTemp = Math.min(state.comfortTemp - 4, 72);
    saveState();
    render();
    showToast("You're back in. Comfort limit restored.");
  }

  function stayIn() {
    state.points += 30;
    state.rewardTodayPoints += 30;
    state.saved = roundMoney(state.saved + 1.2);
    saveState();
    render();
    showToast("Great — +30 bonus points added for staying in.");
  }

  async function shareImpact() {
    const text = `${state.user.name} saved ${currency(state.saved)} and avoided ${number(state.co2Avoided)} lbs CO₂ with Renew Home.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Renew Home impact", text });
        showToast("Impact card shared.");
        return;
      } catch (error) {
        if (error.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      showToast("Impact text copied to clipboard.");
    } catch (error) {
      showToast(text);
    }
  }

  function inviteNeighbor() {
    state.invitedNeighbors += 1;
    state.points += 25;
    saveState();
    render();
    showToast("Invite created. Demo bonus: +25 points.");
  }

  document.addEventListener("click", (event) => {
    const externalAction = event.target.closest("[data-external-action]");
    if (externalAction) {
      if (externalAction.dataset.externalAction === "reset") resetDemo();
      return;
    }

    const nav = event.target.closest("[data-nav]");
    if (nav) {
      goTo(nav.dataset.nav);
      return;
    }

    const device = event.target.closest("[data-device]");
    if (device) {
      toggleDevice(device.dataset.device);
      return;
    }

    const pref = event.target.closest("[data-pref]");
    if (pref) {
      state.preference = pref.dataset.pref;
      saveState();
      render();
      return;
    }

    const reward = event.target.closest("[data-reward]");
    if (reward) {
      redeemReward(reward.dataset.reward);
      return;
    }

    const actionEl = event.target.closest("[data-action]");
    if (!actionEl) return;

    const action = actionEl.dataset.action;
    const actions = {
      "start-onboarding": () => goTo("connect"),
      "sign-in": () => {
        state.onboarded = true;
        goTo("home");
      },
      "continue-comfort": () => {
        if (state.connectedDevices.length === 0) return;
        goTo("comfort");
      },
      "start-saving": () => {
        state.onboarded = true;
        state.currentTemp = Math.min(state.comfortTemp - 4, 72);
        saveState();
        goTo("home");
        showToast("Renew Home is now optimizing your home.");
      },
      "open-event": () => goTo("event"),
      "go-home": () => goTo("home"),
      "go-rewards": () => goTo("rewards"),
      "go-impact": () => goTo("impact"),
      "open-share": () => goTo("share"),
      "opt-out": optOut,
      "rejoin-event": rejoinEvent,
      "stay-in": stayIn,
      "share-impact": shareImpact,
      "invite-neighbor": inviteNeighbor,
      "reset-demo": resetDemo
    };

    if (actions[action]) actions[action]();
  });

  document.addEventListener("input", (event) => {
    if (event.target.id !== "tempRange") return;
    state.comfortTemp = Number(event.target.value);
    const label = document.querySelector("[data-temp-value]");
    if (label) label.textContent = `${state.comfortTemp}°F`;
    saveState();
  });

  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    state = loadState();
    render();
  });

  setInterval(() => {
    if (!state.eventActive) return;
    const remaining = eventRemainingSeconds();
    const minute = Math.floor(remaining / 60);
    if (minute !== lastRenderedMinute && ["event", "events", "home"].includes(state.view)) {
      lastRenderedMinute = minute;
      render();
    }
    if (remaining === 0) render();
  }, 1000);

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(() => undefined);
    });
  }

  render();
})();
