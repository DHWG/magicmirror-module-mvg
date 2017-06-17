const NodeHelper = require('node_helper');
const request = require('request');

module.exports = NodeHelper.create({

  config: {
    authKey: 'MUST_BE_CONFIGURED'
  },

  socketNotificationReceived: function(notification, payload) {
    const self = this;

    switch (notification) {
      case 'configure':
        self.config = payload;
        break;
      case 'getDepartures':
        self.getDepartures(payload.from, payload.to);
        break;
    }
  },

  /**
   * We have to do this on nodejs side to circumvent the CORS protection of MVG.
   */
  getDepartures: function(from, to) {
    const requestOptions = {
      url: `https://www.mvg.de/fahrinfo/api/routing/?fromStation=${from}&toStation=${to}`,
      headers: {
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Referer': 'https://www.mvg.de/',
        'X-MVG-Authorization-Key': this.config.authKey
      }
    };

    const self = this;
    function callback(error, response, body) {
      try {
        var responseObj = JSON.parse(body);
        self.handleDeparturesResponse(responseObj);
      } catch (e) {
        console.error(e, error);
      }
    }

    request(requestOptions, callback);
  },

  /**
   * Throws superfluous information away and passes the connection info to the front-end.
   */
  handleDeparturesResponse: function(response) {
    const list = response.connectionList;
    const payload = {
      from: list[0].from.name,
      to: list[0].to.name,
      connections: list.map(function(connection) {
        return {
          departure: connection.departure,
          arrival: connection.arrival
        }
      })
    }
    this.sendSocketNotification('departures', payload);
  }

});
