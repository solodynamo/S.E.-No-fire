angular.module('stocker.services', [])

  .factory('encodeURIService', function() {
    return {
      encode: function(string) {
        console.log(string);
        return encodeURIComponent(string).replace(/\"/g, "%22").replace(/\ /g, "%20").replace(/[!'()]/g, escape);
      }
    };
  })

  .factory('dateService', function($filter) {

    var currentDate = function() {
    var d = new Date();
    var date = $filter('date')(d, 'yyyy-MM-dd');
    return date;
  };

  var oneYearAgoDate = function() {
    var d = new Date().setDate(new Date().getDate() - 365);
    var date = $filter('date')(d, 'yyyy-MM-dd');
    return date;
  };

  return {
    currentDate: currentDate,
    oneYearAgoDate: oneYearAgoDate
  };

})

  .factory('stockDataService', function($q, $http, encodeURIService) {
    
    var getDetailsData = function(ticker) {
    var deferred = $q.defer();
    var query = 'select * from yahoo.finance.quotes where symbol IN ("' + ticker + '")';
    var url = 'http://query.yahooapis.com/v1/public/yql?q=' + encodeURIService.encode(query) + '&format=json&env=http://datatables.org/alltables.env'

    $http.get(url)
      .success(function(json) {
        deferred.resolve(json.query.results.quote);

      })
      .error(function(error) {
        console.log('Details data error: ' + error);
        deferred.reject();
      });

      return deferred.promise;
    };

  var getPriceData = function (ticker) {
  
    var deferred = $q.defer();
    var url = 'http://finance.yahoo.com/webservice/v1/symbols/' + ticker + '/quote?format=json&view=detail';

    $http.get(url)
      .success(function(json) {
        var jsonData = json.list.resources[0].resource.fields;
        deferred.resolve(jsonData);
      })
      .error(function(error) {
        console.log('Price data error: ' + error);
        deferred.reject();
      });

    return deferred.promise;

  };

  return {
    getPriceData: getPriceData,
    getDetailsData: getDetailsData
  };

})

  .factory('chartDataService', function($q, $http, encodeURIService, chartDataCacheService) {

    var getHistoricalData = function(ticker, fromDate, todayDate) {

    var deferred = $q.defer();
    var query = 'select * from yahoo.finance.historicaldata where symbol = "' + ticker + '" and startDate = "' + fromDate + '" and endDate = "' + todayDate + '"';
    var url = 'http://query.yahooapis.com/v1/public/yql?q=' + encodeURIService.encode(query) + '&format=json&env=http://datatables.org/alltables.env';
    var chacheKey = ticker; 
    var chartDataCache = chartDataCacheService.get(chacheKey);

    if(chartDataCache)  {
      deferred.resolve(chartDataCache);
    }

    else  {
      $http.get(url)
      .success(function(json) {
        var jsonData = json.query.results.quote;
        var priceData = [];
        var volumeData = [];

        jsonData.forEach(function(dayDataObject) {
          var dateToMillis = dayDataObject.Date;
          var date =  Date.parse(dateToMillis);
          var price = parseFloat(Math.round(dayDataObject.Close * 100)/ 100).toFixed(3);
          var volume = dayDataObject.Volume;
          var volumeDatum = '[' + date + ', ' + volume + ']';
          var priceDatum = '[' + date + ', ' + price + ']';

          volumeData.unshift(volumeDatum);
          priceData.unshift(priceDatum);

        });

        var formattedChartData =
        '[{' + 
          '"key":' + '"volume",' +
          '"bar":' + 'true,' +
          '"values":' + '[' + volumeData + ']' +
        '},' +
        '{' +
          '"key":' + '"' + ticker + '",' +
          '"values":' + '[' + priceData + ']' +
        '}]';

        deferred.resolve(formattedChartData);
        chartDataCacheService.put(chacheKey,formattedChartData);
      })
      .error(function(error) {
        deferred.reject();
      });

    }
    return deferred.promise;
  };

  return {
    getHistoricalData: getHistoricalData
  };
})


  .factory('customService', function ($ionicLoading, $ionicPopup, $q) {
     var _on = function () {
      $ionicLoading.show({
      content: 'android',
      animation: 'fade-in',
      showBackdrop: true,
      maxWidth: 200,
      showDelay: 0
      });
        
    }

    var _off = function () {
      $ionicLoading.hide();
    }

    return {
        _on: _on,
        _off: _off
    }
   
 })

.factory('chartDataCacheService', ['CacheFactory', function(CacheFactory){
 
 var chartDataCache;

  if(!CacheFactory.get('chartDataCache')) {
 
    chartDataCache=CacheFactory('chartDataCache',{
    maxAge:60*60*8*1000,
    deleteOnExpire:'aggressive',
    storageMode:'localStorage'
  })

 } else {

  chartDataCache=CacheFactory.get('chartDataCache');
 }

 return chartDataCache;

}])

.factory('notesCacheService', function(CacheFactory) {

  var notesCache;

  if(!CacheFactory.get('notesCache')) {
    notesCache = CacheFactory('notesCache', {
      storageMode: 'localStorage'
    });
  } else {
    notesCache = CacheFactory.get('notesCache');
  }

  return notesCache;
})


.factory('notesService', function(notesCacheService) {

  return {

    getNotes: function(ticker) {
      return notesCacheService.get(ticker);
    },

    addNote: function(ticker, note) {
      var stockNotes = [];

      if( notesCacheService.get(ticker) ) {
        stockNotes = notesCacheService.get(ticker);
        stockNotes.push(note);
      } else {
        stockNotes.push(note);
      }
      notesCacheService.put(ticker, stockNotes);
    },

    deleteNote: function(ticker, index) {
      var stockNotes = [];

      stockNotes = notesCacheService.get(ticker);
      stockNotes.splice(index, 1);
      notesCacheService.put(ticker, stockNotes);
    }
  }
})

.factory('newsService', function($q, $http) {

  return {

    getNews: function(ticker) {

      var deferred = $q.defer();
      var x2js = new X2JS();
      var url = 'http://finance.yahoo.com/rss/headline?s=' + ticker;

      $http.get(url)
        .success(function(xml) {
          var xmlDoc = x2js.parseXmlString(xml);
          var json = x2js.xml2json(xmlDoc);
          var jsonData = json.rss.channel.item;
          deferred.resolve(jsonData);
        })
        .error(function(error) {
          deferred.reject();
          console.log('News error: ' + error);
        });

      return deferred.promise;

    }
  }
})


.factory('fillMyStocksCacheService', function(CacheFactory){
  
  var myStocksCache;

  if(!CacheFactory.get('myStocksCache')) {
    myStocksCache = CacheFactory('myStocksCache', {
      storageMode: 'localStorage'
    });
  } else {
    myStocksCache = CacheFactory.get('myStocksCache');
  }
//it will fill the page with default stocks but after that user will control it 
  var fillMyStocksCache = function() {

    var myStocksArray = [
      { selectedStock: "AAPL" },
      { selectedStock: "GPRO" },
      { selectedStock: "FB" },
      { selectedStock: "NFLX" },
      { selectedStock: "TSLA" },
      { selectedStock: "BRK-A" },
      { selectedStock: "INTC" },
      { selectedStock: "MSFT" },
      { selectedStock: "GE" },
      { selectedStock: "BAC" },
      { selectedStock: "C" },
      { selectedStock: "T" }
    ];

    myStocksCache.put('myStocks', myStocksArray);
  };

  return {
    fillMyStocksCache: fillMyStocksCache
  };

})


.factory('myStocksCacheService', function(CacheFactory) {

  var myStocksCache = CacheFactory.get('myStocksCache');

  return myStocksCache;
})


.factory('myStocksArrayService', function(fillMyStocksCacheService, myStocksCacheService) {

  if(!myStocksCacheService.info('myStocks')) {
    fillMyStocksCacheService.fillMyStocksCache();
  }

  var myStocks = myStocksCacheService.get('myStocks');

  return myStocks;

})

.factory('followStockService', function(myStocksArrayService, myStocksCacheService) {

  return {

    follow: function(ticker) {

      var stockToAdd = {"selectedStock": ticker};

      myStocksArrayService.push(stockToAdd);
      myStocksCacheService.put('myStocks', myStocksArrayService);
    },

    unfollow: function(ticker) {

      for(var i = 0; i < myStocksArrayService.length; i++) {
        if(myStocksArrayService[i].selectedStock == ticker) {
          myStocksArrayService.splice(i, 1);
          myStocksCacheService.remove('myStocks');
          myStocksCacheService.put('myStocks', myStocksArrayService);

          break;
        }
      }
    },

    checkFollowing: function(ticker) {

      for (var i = 0; i < myStocksArrayService.length; i++) {
        if(myStocksArrayService[i].selectedStock == ticker) {
          return true;
        }
      }

      return false;
    }
  }
})
.service('modalService', function($ionicModal) {

  this.openModal = function(id) {

    var _this = this;

    if (id == 1) {
      $ionicModal.fromTemplateUrl('templates/search.html', {
        scope: null,
        controller: 'SearchCtrl' 
      }).then(function(modal) {
        _this.modal = modal;
        _this.modal.show();
      });
    } else if (id == 2) {
      $ionicModal.fromTemplateUrl('templates/login.html', {
        scope: null,
        controller: 'LoginSearchCtrl'
      }).then(function(modal) {
        _this.modal = modal;
        _this.modal.show();
      });
    } else if (id = 3) {
      $ionicModal.fromTemplateUrl('templates/signup.html', {
        scope: null,
        controller: 'LoginSearchCtrl'
      }).then(function(modal) {
        _this.modal = modal;
        _this.modal.show();
      });
    }
  }

  this.closeModal = function() {
    
    var _this = this;

    if(!_this.modal) return;
    _this.modal.hide();
    _this.modal.remove();
  };

})


.factory('searchService', function($q, $http) {

  return {

    search: function(query) {
      
      var deferred = $q.defer()
      
      var url = 'https://s.yimg.com/aq/autoc?query=' + query + '&region=CA&lang=en-CA&callback=YAHOO.util.ScriptNodeDataSource.callbacks'

      YAHOO = window.YAHOO = {
        util: {
          ScriptNodeDataSource: {}
        }
      };

      YAHOO.util.ScriptNodeDataSource.callbacks = function(data) {
        var jsonData = data.ResultSet.Result;
        deferred.resolve(jsonData);
      };

      $http.jsonp(url)
        .then(YAHOO.util.ScriptNodeDataSource.callbacks);

      return deferred.promise;
    }
  }
})