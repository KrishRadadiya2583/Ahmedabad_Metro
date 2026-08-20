document.addEventListener('DOMContentLoaded', () => {
  const navToggle = document.querySelector('.nav-toggle');
  const primaryNavigation = document.getElementById('primary-navigation');
  if (navToggle && primaryNavigation) {
    const setNavigationOpen = (open) => {
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
      primaryNavigation.classList.toggle('is-open', open);
      document.body.classList.toggle('nav-open', open);
    };
    navToggle.addEventListener('click', () => setNavigationOpen(navToggle.getAttribute('aria-expanded') !== 'true'));
    primaryNavigation.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setNavigationOpen(false)));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') setNavigationOpen(false); });
    window.addEventListener('resize', () => { if (window.innerWidth > 800) setNavigationOpen(false); });
  }

  document.querySelectorAll('[data-filter-select]').forEach(input => {
    const select = document.getElementById(input.dataset.filterSelect);
    if (!select) return;
    input.addEventListener('input', () => {
      const term = input.value.trim().toLowerCase();
      Array.from(select.options).forEach((option, index) => { if (index) option.hidden = Boolean(term) && !option.textContent.toLowerCase().includes(term); });
      const visible = Array.from(select.options).filter((option, index) => index && !option.hidden);
      if (visible.length === 1) select.value = visible[0].value;
    });
  });

  const nearestButton = document.getElementById('find-nearest');
  if (nearestButton) nearestButton.addEventListener('click', () => {
    const results = document.getElementById('nearest-results');
    if (!navigator.geolocation) { results.innerHTML = '<div class="alert error">Location is not supported by this browser.</div>'; return; }
    nearestButton.disabled = true; nearestButton.textContent = 'Finding stations…';
    navigator.geolocation.getCurrentPosition(async position => {
      const { latitude, longitude } = position.coords;
      try {
        const query = `[out:json][timeout:20];nwr(around:15000,${latitude},${longitude})[railway=station];out center tags;`;
        const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Station service is temporarily unavailable.');
        const data = await response.json();
        const distance = (lat, lon) => {
          const rad = value => value * Math.PI / 180, earth = 6371;
          const dLat = rad(lat - latitude), dLon = rad(lon - longitude);
          const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(latitude)) * Math.cos(rad(lat)) * Math.sin(dLon / 2) ** 2;
          return earth * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        };
        const stations = data.elements.map(item => ({ name: item.tags?.name || item.tags?.['name:en'], lat: item.lat || item.center?.lat, lon: item.lon || item.center?.lon, tags: item.tags || {} }))
          .filter(item => item.name && item.lat && item.lon)
          .map(item => ({ ...item, distance: distance(item.lat, item.lon), metro: /metro|gmrc/i.test(`${item.name} ${item.tags.network || ''} ${item.tags.operator || ''}`) || /subway|light_rail/.test(item.tags.station || '') }))
          .sort((a, b) => Number(b.metro) - Number(a.metro) || a.distance - b.distance).slice(0, 5);
        if (!stations.length) throw new Error('No rail or metro station was found within 15 km.');
        results.innerHTML = `<div class="nearest-heading"><div><span class="eyebrow">Near you</span><h2>Closest stations</h2></div><small>Approximate straight-line distance</small></div><div class="nearby-list">${stations.map((station, index) => `<article class="nearby-station"><span class="station-rank">${index + 1}</span><div><strong>${station.name.replace(/[&<>"']/g, '')}</strong><small>${station.metro ? 'Metro station' : 'Rail station'} · ${station.distance.toFixed(1)} km away</small></div><a href="https://www.google.com/maps/dir/?api=1&origin=${latitude},${longitude}&destination=${station.lat},${station.lon}&travelmode=walking" target="_blank" rel="noopener">Directions</a></article>`).join('')}</div>`;
      } catch (error) { results.innerHTML = `<div class="alert error">${error.message}</div>`; }
      finally { nearestButton.disabled = false; nearestButton.textContent = 'Refresh my location'; }
    }, error => {
      results.innerHTML = `<div class="alert error">${error.code === 1 ? 'Location permission was denied. Enable it in browser settings and try again.' : 'Your location could not be determined.'}</div>`;
      nearestButton.disabled = false; nearestButton.textContent = 'Try again';
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  });
  const revealItems = document.querySelectorAll('.card, .profile-stat, .route-card, .ticket-row');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    revealItems.forEach(item => item.classList.add('reveal-item'));
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('revealed'); observer.unobserve(entry.target); }
    }), { threshold: .12 });
    revealItems.forEach(item => observer.observe(item));
  }
  const authLanding = document.querySelector('[data-auth-mode]');
  if (authLanding) {
    const showAuth = (mode) => {
      authLanding.dataset.authMode = mode;
      document.querySelectorAll('[data-auth-tab]').forEach(tab => {
        const active = tab.dataset.authTab === mode;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', String(active));
      });
      document.querySelectorAll('[data-auth-form]').forEach(form => form.classList.toggle('active', form.dataset.authForm === mode));
      history.replaceState(null, '', `#${mode}`);
    };
    document.querySelectorAll('[data-auth-tab], [data-auth-link]').forEach(control => control.addEventListener('click', () => showAuth(control.dataset.authTab || control.dataset.authLink)));
    showAuth(location.hash === '#register' ? 'register' : authLanding.dataset.authMode || 'login');
  }
  const swap = document.querySelector('[data-swap-stations]');
  if (swap) swap.addEventListener('click', () => {
    const from = document.getElementById('start-station') || document.getElementById('startStation');
    const to = document.getElementById('end-station') || document.getElementById('endStation');
    [from.value, to.value] = [to.value, from.value];
  });
  document.querySelectorAll('[data-quick-from][data-quick-to]').forEach(button => button.addEventListener('click', () => {
    const from = document.getElementById('start-station');
    const to = document.getElementById('end-station');
    if (!from || !to) return;
    from.value = button.dataset.quickFrom;
    to.value = button.dataset.quickTo;
    from.closest('form')?.requestSubmit();
  }));
  const journeyDate = document.getElementById('journey-current-date');
  const journeyTime = document.getElementById('journey-current-time');
  if (journeyDate && journeyTime) {
    const updateJourneyClock = () => {
      const now = new Date();
      journeyDate.textContent = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
      journeyTime.textContent = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    };
    updateJourneyClock();
    setInterval(updateJourneyClock, 30000);
  }
  const stationInputEls = document.querySelectorAll('[data-station-search]');
  const stationLists = document.querySelectorAll('[data-station-list]');

  const allStations = Array.from(document.querySelectorAll('[data-station-option]')).map(opt => opt.value);

  const filterStations = (input, list) => {
    const term = input.value.trim().toLowerCase();
    list.innerHTML = '';

    const matches = allStations.filter(station => station.toLowerCase().includes(term));

    matches.slice(0, 12).forEach(station => {
      const li = document.createElement('li');
      li.textContent = station.replace(/_/g, ' ');
      list.appendChild(li);
    });
  };

  stationInputEls.forEach((inputEl) => {
    const list = inputEl.nextElementSibling;
    if (!list || !list.hasAttribute('data-station-list')) return;

    inputEl.addEventListener('input', () => filterStations(inputEl, list));
  });

  stationLists.forEach((list) => {
    if (!list.children.length) {
      allStations.slice(0, 12).forEach(station => {
        const li = document.createElement('li');
        li.textContent = station.replace(/_/g, ' ');
        list.appendChild(li);
      });
    }
  });
});

const payButton = document.getElementById('pay-button');
if (payButton) {
  payButton.addEventListener('click', async () => {
    const message = document.getElementById('payment-message');
    const generationPopup = document.querySelector('[data-ticket-generation]');
    let paymentCompleted = false;
    const showGenerationPopup = () => {
      if (!generationPopup) return;
      generationPopup.hidden = false;
      document.body.classList.add('ticket-generation-open');
    };
    const hideGenerationPopup = () => {
      if (!generationPopup) return;
      generationPopup.hidden = true;
      document.body.classList.remove('ticket-generation-open');
    };
    payButton.disabled = true; message.textContent = 'Starting secure checkout…';
    try {
      const orderResponse = await fetch('/api/payment/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ startStation: payButton.dataset.start, endStation: payButton.dataset.end }) });
      const order = await orderResponse.json();
      if (!orderResponse.ok) throw new Error(order.error);
      const checkout = new Razorpay({
        key: order.keyId, amount: order.amount, currency: order.currency, order_id: order.orderId,
        name: 'Ahmedabad Metro', description: 'Metro ticket purchase',
        prefill: { name: order.user.name, email: order.user.email },
        theme: { color: '#0057ff' },
        handler: async (payment) => {
          paymentCompleted = true;
          message.textContent = 'Payment complete. Generating your ticket…';
          showGenerationPopup();
          try {
            const verifyTicket = () => fetch('/api/payment/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payment) });
            let verifyResponse;
            try { verifyResponse = await verifyTicket(); }
            catch { verifyResponse = await verifyTicket(); }
            const result = await verifyResponse.json();
            if (!verifyResponse.ok) throw new Error(result.error || 'Could not generate your ticket.');
            window.location.assign(result.redirectUrl);
          } catch (error) {
            hideGenerationPopup();
            payButton.disabled = false;
            message.textContent = error.message || 'Could not generate your ticket. Please try again.';
          }
        },
        modal: { ondismiss: () => { if (!paymentCompleted) { payButton.disabled = false; message.textContent = 'Checkout closed. No ticket was issued.'; } } }
      });
      checkout.on('payment.failed', response => { payButton.disabled = false; message.textContent = response.error.description || 'Payment failed.'; });
      checkout.open();
    } catch (error) { payButton.disabled = false; message.textContent = error.message || 'Could not start payment.'; }
  });
}

const shareTicketButton = document.querySelector('[data-share-ticket]');
if (shareTicketButton) {
  shareTicketButton.addEventListener('click', async () => {
    const message = document.querySelector('[data-share-message]');
    const downloadUrl = shareTicketButton.dataset.downloadUrl;
    const code = shareTicketButton.dataset.ticketCode;
    shareTicketButton.disabled = true;
    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error('Could not prepare the ticket for sharing.');
      const file = new File([await response.blob()], `metro-ticket-${code}.pdf`, { type: 'application/pdf' });
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ title: `Ahmedabad Metro Ticket #${code}`, text: 'My Ahmedabad Metro digital ticket', files: [file] });
        message.textContent = 'Ticket shared successfully.';
      } else {
        const fileUrl = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = file.name;
        link.click();
        URL.revokeObjectURL(fileUrl);
        message.textContent = 'Direct sharing is not supported here, so the shareable ticket was downloaded.';
      }
    } catch (error) {
      if (error.name !== 'AbortError') message.textContent = error.message || 'Ticket sharing was cancelled.';
    } finally {
      shareTicketButton.disabled = false;
    }
  });
}
