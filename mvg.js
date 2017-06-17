Module.register('mvg', {

  defaults: {
    from: 490,
    to: [2, 460],
    updateInterval: 60,
    walkingTime: 10
  },

  _from: '',
  _cache: {},

  /**
   * Trigger initial data gathering and schedule regular updates.
   */
  start: function() {
    // pass module config on to node module
    this.sendSocketNotification('configure', this.config);
    var self = this;
    setInterval(function() {
      self._updateConnections();
    }, this.config.updateInterval * 1000);
    this._updateConnections();
  },

  /**
   * Triggers data updates for all configured target station.
   */
  _updateConnections: function() {
    for (let to of this.config.to) {
      this.sendSocketNotification('getDepartures', {from: this.config.from, to: to});
    }
  },

  /**
   * Handle incoming messages from the back-end.
   */
  socketNotificationReceived: function(notification, payload) {
    switch (notification) {
      case 'departures':
        this._handleDeparturesResponse(payload);
        break;
    }
  },

  /**
   * Updates the connection data and triggers a UI update.
   */
  _handleDeparturesResponse: function(payload) {
    this._from = payload.from;
    for (let connection of payload.connections) {
      connection.timeLeft = connection.departure - new Date().getTime();
    }
    console.log(payload);
    this._cache[payload.to] = payload.connections; 
    this.updateDom(1000);
  },

  /**
   * Produce HTML representation.
   */
  getDom: function() {
    let wrapper = document.createElement('div');
    wrapper.className = 'mvg-wrapper';

    for (let targetStation of Object.keys(this._cache)) {
      let container = document.createElement('div');
      container.className = 'mvg-station';
      container.innerHTML = this._htmlForStation(targetStation);
      wrapper.appendChild(container);
    }
    
    let title = `<h2>Departures: ${this._from}</h2>`;
    wrapper.innerHTML = title + wrapper.innerHTML;

    return wrapper;
  },

  /**
   * Produce the HTML fragment for a certain target station.
   */
  _htmlForStation: function(targetStation) {
    let cache = this._cache[targetStation];

    // Produces a simple HH:MM representation of a Date object.
    let timeStr = (ms) => {
      let date = new Date(ms);
      let minutes = '' + date.getMinutes();
      minutes = minutes.length == 1 ? '0' + minutes : minutes;
      return `${date.getHours()}:${minutes}`;
    };

    // ignore connections in the past
    let nextDeparture = cache.find((connection) => connection.timeLeft - this.config.walkingTime * 60 * 1000 > 0);

    let timeLeft = nextDeparture.timeLeft;
    timeLeft /= 1000 * 60;
    timeLeft = Math.round(timeLeft);

    let content = `<div class="mvg-con-head">${targetStation}</div>`;

    // departure and arrival
    content += `<div class="mvg-con-body">In ${timeLeft} min `;
    content += `<span class="mvg-con-exact">(${timeStr(nextDeparture.departure)} > ${timeStr(nextDeparture.arrival)})</span>`;
    content += '</div>';

    // display the n trains after the next one
    content += `<div class="mvg-con-next">Next: `;
    let numberOfNextTrains = 3;
    let usedSlots = 0;
    for (let i = 0; i < cache.length && usedSlots < numberOfNextTrains; i++) {
      let dep = cache[i];
      if (dep.departure > nextDeparture.departure) {
        content += timeStr(dep.departure) + ' ';
        usedSlots++;
      }
    }
    content += '</div>';

    return content;
  },

  getScripts: function() {
    return ['https://code.jquery.com/jquery-3.2.1.min.js'];
  },

  getStyles: function() {
    return ['mvg.css'];
  }

});
