
angular.module('stocker.controllers', [])

  .controller('MainCtrl', function($scope, $ionicModal, $timeout, modalService) {

    var vm= this;
    vm.loginData = {};

    $scope.modalService = modalService;

    // $ionicModal.fromTemplateUrl('templates/login.html', {
    //   scope: $scope
    // }).then(function(modal) {
    //   $scope.modal = modal;
    // });

    vm.closeLogin = function() {
      $scope.modal.hide();
    };

    vm.login = function() {
      $scope.modal.show();
    };

    vm.doLogin = function() {

    }

  
})

.controller('MyStocksCtrl', ['$scope', 'myStocksArrayService',
  function($scope, myStocksArrayService) {
    var vm= this;
    console.log(myStocksArrayService);
    vm.myStocksArray = myStocksArrayService;

  }
])

.controller('StockCtrl', ['$scope', '$stateParams', 'stockDataService', 'customService', 'dateService', '$window', 'chartDataService', '$ionicPopup', 'notesService' , 'newsService', 'followStockService',

  function($scope, $stateParams, stockDataService, customService, dateService, $window, chartDataService, $ionicPopup ,notesService, newsService, followStockService) {

    var vm= this;
    vm.selectedStock = $stateParams.selectedStock;
    vm.todayDate=dateService.currentDate();
    vm.oneYearAgoDate=dateService.oneYearAgoDate();
    vm.stockNotes = [];
    vm.following = followStockService.checkFollowing(vm.selectedStock);

    vm.toggleFollow = function() {
      if(vm.following) {
        followStockService.unfollow(vm.selectedStock);
        vm.following = false;
      } else{
        followStockService.follow(vm.selectedStock);
        vm.following = true;
      }
    }

     $scope.chartView = 4;
  
     vm.chartViewFunc = function(n) {
       $scope.chartView = n;
     }

    // $scope.$watch("vm.selectedChart",function(newVal,oldVal)
    // {
    //   console.log("tyekjl");
    // });

    $scope.$on("$ionicView.afterEnter", function() {
      getPriceData();
      getDetailsData();
      getChartData();
      vm.stockNotes = notesService.getNotes(vm.selectedStock);
      getNews();
      
    });

    function getPriceData() {
      var promise = stockDataService.getPriceData(vm.selectedStock);

      promise.then(function(data) {
        vm.stockPriceData=data;
        console.log("price data",data);
      });
    }

    function getDetailsData() {
    
       customService._on();
      stockDataService.getDetailsData(vm.selectedStock).then(function(data) {
        vm.stockDetailsData=data;
        customService._off();
        console.log("details data",data);
      });
    }
  function getChartData() {

      var promise = chartDataService.getHistoricalData($stateParams.selectedStock, vm.oneYearAgoDate, vm.todayDate);

      promise.then(function(data) {

        $scope.myData = JSON.parse(data)
          .map(function(series) {
            series.values = series.values.map(function(d) { return {x: d[0], y: d[1] }; });
            return series;
          });

      });
    }

    var xTickFormat = function(d) {
      var dx = $scope.myData[0].values[d] && $scope.myData[0].values[d].x || 0;
      if (dx > 0) {
        return d3.time.format("%b %d")(new Date(dx));
      }
      return null;
    };

    var x2TickFormat = function(d) {
      var dx = $scope.myData[0].values[d] && $scope.myData[0].values[d].x || 0;
      return d3.time.format('%b %Y')(new Date(dx));
    };

    var y1TickFormat = function(d) {
      return d3.format(',f')(d);
    };

    var y2TickFormat = function(d) {
      return d3.format('s')(d);
    };

    var y3TickFormat = function(d) {
      return d3.format(',.2s')(d);
    };

    var y4TickFormat = function(d) {
      return d3.format(',.2s')(d);
    };

    var xValueFunction = function(d, i) {
      return i;
    };

    var marginBottom = ($window.innerWidth / 100) * 5;

    $scope.chartOptions = {
      chartType: 'linePlusBarWithFocusChart',
      data: 'myData',
      margin: {top: marginBottom, right: 0, bottom: 0, left: 0},
      interpolate: "cardinal",
      useInteractiveGuideline: true,
      yShowMaxMin: false,
      tooltips: true,
      showLegend: false,
      useVoronoi: false,
      xShowMaxMin: false,
      xValue: xValueFunction,
      xAxisTickFormat: xTickFormat,
      x2AxisTickFormat: x2TickFormat,
      y1AxisTickFormat: y1TickFormat,
      y2AxisTickFormat: y2TickFormat,
      y3AxisTickFormat: y3TickFormat,
      y4AxisTickFormat: y4TickFormat,
      transitionDuration: 500,
      y1AxisLabel:'Price',
      y3AxisLabel:'Volume'
    };

    vm.addNote = function() {
      $scope.note = {title:"note", description:"type it pal....!", ticker:vm.selectedStock ,date: vm.todayDate};

      var note = $ionicPopup.show({
        template: '<textarea type="text" ng-model="note.description"></textarea>',
        title: '' ,
        subTitle:vm.selectedStock,
        scope: $scope,
        buttons: [
          { text: 'Cancel' },
          {
            text: '<b>Save</b>',
            type: 'button-positive',
            onTap: function(e) {
              notesService.addNote(vm.selectedStock, $scope.note);
            }
          }
        ]
    });

    note.then(function(res) {
      vm.stockNotes = notesService.getNotes(vm.selectedStock);
    });
  }

  vm.openNote = function(index, noteObj) {
      // $scope.note = {title:title, description:description, ticker:vm.selectedStock ,date: vm.todayDate};

      var note = $ionicPopup.show({
        template: noteObj.description,
        title: '' ,
        subTitle:noteObj.ticker,
        scope: $scope,
        buttons: [
          { 
            text: 'Cancel' ,
            onTap: function()
            {
              $ionicPopup.close();
            } 
          },
          { 
            text: 'Delete',
            type: 'button-assertive',
            onTap : function() {
              notesService.deleteNote(noteObj.ticker,index);
            }
          }
        ]
    });

    note.then(function(res) {
      vm.stockNotes = notesService.getNotes(vm.selectedStock);
    });
  }

  function getNews() {

    vm.newsStories = [];

    var promise = newsService.getNews(vm.selectedStock);

    promise.then(function(data) {
      vm.newsStories = data;
      console.log(vm.newsStories);
    })
  }

  vm.openNews = function(link) {
    console.log(link);
  }


}])

.controller('SearchCtrl', ['$scope', '$state', 'modalService', 'searchService',
  function($scope, $state, modalService, searchService) {

    $scope.closeModal = function() {
      modalService.closeModal();
    };

    $scope.search = function() {
      $scope.searchResults = '';
      startSearch($scope.searchQuery);
    }

    var startSearch = ionic.debounce(function(query) {
      searchService.search(query)
        .then(function(data) {
          $scope.searchResults = data;
          console.log("stats",data);
        });
    }, 750);

    $scope.goToStock = function(ticker) {
      modalService.closeModal();
      $state.go('app.stock', {selectedStock: ticker});
    };
  }
])
// .controller('LoginSignupCtrl', ['$scope', 'modalService', 'userService',
//   function($scope, modalService, userService) {

//     $scope.user = {email: '', password: ''};

//     $scope.closeModal = function() {
//       modalService.closeModal();
//     };

//     $scope.signup = function(user) {
//       userService.signup(user);
//     };

//     $scope.login = function(user) {
//       userService.login(user);
//     };
//   }
// ])

;