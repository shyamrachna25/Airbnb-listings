

function MainModule(listingsID = "#listings") {
  const me = {};
 
 
  const listingsElement = document.querySelector(listingsID);
  const compareTrayElement = document.querySelector("#compareTray");
  const compareContentElement = document.querySelector("#compareContent");
  const compareCountElement = document.querySelector("#compareCount");
  const clearCompareBtn = document.querySelector("#clearCompare");
 
  const MAX_COMPARE = 3;
 
  // holds the currently loaded listings and which ones are selected to compare
  let allListings = [];
  const selectedIds = new Set();

  <!-- You were very thorough with the way you escaped and parsed the data -->
  // basic escaping since we're building HTML with template strings from
  // fields that come straight out of the dataset
  function escapeHTML(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }
 
  // only shows first part for the card title
  function cleanName(name) {
    if (!name) return "Untitled listing";
    return name.split(" · ")[0];
  }
 
  // price comes in as a string like "$187.00"
  function parsePrice(priceStr) {
    if (!priceStr) return 0;
    return parseFloat(priceStr.replace(/[^0-9.]/g, "")) || 0;
  }
 
  function formatPrice(priceStr) {
    return `$${parsePrice(priceStr)}`;
  }
 
  // amenities is a JSON-encoded string in the raw data, e.g. '["Wifi","Kitchen"]'
  function parseAmenities(amenitiesStr) {
    try {
      const parsed = JSON.parse(amenitiesStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
 
  function truncate(text, maxLen) {
    if (!text) return "";
    return text.length > maxLen ? text.slice(0, maxLen) + "…" : text;
  }
 
  // builds one listing card, including the Compare button that drives the tray
  function getListingCode(listing) {
    const amenities = parseAmenities(listing.amenities);
    const topAmenities = amenities.slice(0, 5);
    const isSelected = selectedIds.has(listing.id);

    /* Something seems to be wrong with the onerror attribute. When I view it in a browser
       the card seems to be moving up and down in a glitchy way. I think it has to do with
       the placeholder for img. */
    return `<div class="col-4">
  <div class="listing card ${isSelected ? "is-comparing" : ""}" data-id="${listing.id}">
    <img
      src="${escapeHTML(listing.picture_url)}"
      class="card-img-top"
      alt="${escapeHTML(cleanName(listing.name))}"
      onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'"
    />
    <div class="card-body">
      <h2 class="card-title">${escapeHTML(cleanName(listing.name))}</h2>
 
      <div class="host">
        <img
          src="${escapeHTML(listing.host_picture_url)}"
          alt="${escapeHTML(listing.host_name)}"
          onerror="this.src='https://via.placeholder.com/32'"
        />
        <span>Hosted by ${escapeHTML(listing.host_name)}</span>
      </div>
 
      <div class="price-tag">${formatPrice(listing.price)} / night</div>
 
      <p class="card-text">${escapeHTML(truncate(listing.description, 140))}</p>

     /* I like how you made badges for the amenities. It really distinguishes them from the other content.
        I also like how you limited them to 5. I listed them all and for some listings that was a lot. */
      <div class="amenities mb-2">
        ${topAmenities
          .map(
            (a) => `<span class="badge bg-secondary amenity-badge">${escapeHTML(a)}</span>`,
          )
          .join("")}
      </div>
 
      <button
        class="btn btn-sm ${isSelected ? "btn-primary" : "btn-outline-primary"} compare-btn"
        data-id="${listing.id}"
      >
        ${isSelected ? "Remove from compare" : "Compare"}
      </button>
    </div>
  </div>
  <!-- /card -->
  </div>
 
  `;
  }
 
  function redraw(listings) {
    allListings = listings;
    listingsElement.innerHTML = listings.map(getListingCode).join("\n");
 
    // wire up the compare buttons now that they exist in the DOM
    listingsElement.querySelectorAll(".compare-btn").forEach((btn) => {
      btn.addEventListener("click", () => toggleCompare(btn.dataset.id));
    });
  }
 
  // the compare tray logic
  function toggleCompare(idStr) {
    const id = Number(idStr);
 
    if (selectedIds.has(id)) {
      selectedIds.delete(id);
    } else {
      if (selectedIds.size >= MAX_COMPARE) {
        alert(`You can only compare up to ${MAX_COMPARE} listings at once.`);
        return;
      }
      selectedIds.add(id);
    }
 
    redraw(allListings);
    redrawCompareTray();
  }
 
  function redrawCompareTray() {
    const selected = allListings.filter((l) => selectedIds.has(l.id));
 
    compareCountElement.textContent = selected.length;
 
    if (selected.length === 0) {
      compareTrayElement.classList.add("d-none");
      return;
    }
    compareTrayElement.classList.remove("d-none");
 
    // figure out which listing "wins" on price (lowest) and rating (highest)
    const prices = selected.map((l) => parsePrice(l.price));
    const ratings = selected.map((l) => l.review_scores_rating || 0);
    const lowestPrice = Math.min(...prices);
    const highestRating = Math.max(...ratings);
 
    // for each listing, work out which amenities NO other selected listing has
    const amenitySets = selected.map((l) => new Set(parseAmenities(l.amenities)));
 
    compareContentElement.innerHTML = selected
      .map((listing, i) => {
        const price = parsePrice(listing.price);
        const rating = listing.review_scores_rating || 0;
 
        const otherAmenities = new Set();
        amenitySets.forEach((set, j) => {
          if (j !== i) set.forEach((a) => otherAmenities.add(a));
        });
        const onlyHere = [...amenitySets[i]].filter((a) => !otherAmenities.has(a));
 
        return `
        <div class="col-md-4">
          <div class="compare-card">
            <img src="${escapeHTML(listing.picture_url)}" onerror="this.src='https://via.placeholder.com/300x100?text=No+Image'" />
            <h6 class="mt-2">${escapeHTML(cleanName(listing.name))}</h6>
            <div>Price: <span class="${price === lowestPrice ? "best" : ""}">${formatPrice(listing.price)}</span></div>
            <div>Rating: <span class="${rating === highestRating && rating > 0 ? "best" : ""}">${rating || "N/A"}</span></div>
            <div>Bedrooms: ${listing.bedrooms ?? "N/A"}</div>
            <div>Accommodates: ${listing.accommodates ?? "N/A"}</div>
            <div class="only-here mt-2">
              ${
                onlyHere.length > 0
                  ? `<strong>Only here:</strong> ${onlyHere.slice(0, 4).map(escapeHTML).join(", ")}`
                  : `<em>No unique amenities vs. the others picked</em>`
              }
            </div>
          </div>
        </div>`;
      })
      .join("\n");
  }
 
  clearCompareBtn.addEventListener("click", () => {
    selectedIds.clear();
    redraw(allListings);
    redrawCompareTray();
  });
 
  // loading data
  async function loadData() {
    const res = await fetch("./airbnb_sf_listings_500.json");
    const listings = await res.json();
 
 
    me.redraw(listings.slice(0, 50));
  }
 
  me.redraw = redraw;
  me.loadData = loadData;
 
  return me;
}
 
const main = MainModule();
main.loadData();
 
