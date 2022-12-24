App = {
  web3Provider: null,
  contracts: {},
  account: '0x0',
  hasVoted: false,

  init: async function () {
    return await App.initWeb3();
  },

  initWeb3: async function () {
    // TODO: refactor conditional
    if (typeof web3 !== 'undefined') {
      // If a web3 instance is already provided by Meta Mask.
      App.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider);
    } else {
      // Specify default instance if no web3 instance provided
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
      web3 = new Web3(App.web3Provider);
    }
    return App.initContract();
  },

  initContract: function () {
    $.getJSON("Election.json", function (election) {
      // Instantiate a new truffle contract from the artifact
      App.contracts.Election = TruffleContract(election);
      // Connect provider to interact with contract
      App.contracts.Election.setProvider(App.web3Provider);

      App.listenForEvents();

      return App.render();
    });
  },

  // Listen for events emitted from the contract
  listenForEvents: async function () {
    const election = await App.contracts.Election.deployed()

    election.VoteEvent({}, {
      fromBlock: 0,
      toBlock: 'latest'
    }).watch(function (error, event) {
      console.log("event triggered", event)
      // Reload when a new vote is recorded
      App.render();
    });
  },

  render: async function () {
    const loader = $("#loader");
    const content = $("#content");

    loader.show();
    content.hide();

    // Load account data
    web3.eth.getCoinbase(function (err, account) {
      if (err === null) {
        App.account = account;
        $("#accountAddress").html("Your Account: " + account);
      }
    });

    try {
      // Load contract data
      const electionInstance = await App.contracts.Election.deployed()
      const candidatesCount = await electionInstance.candidatesCount();

      var candidatesResults = $("#candidatesResults");
      candidatesResults.empty();

      var candidatesSelect = $('#candidatesSelect');
      candidatesSelect.empty();

      var candidate
      for (var i = 1; i <= candidatesCount; i++) {
        candidate = await electionInstance.candidates(i)
        var id = candidate[0];
        var name = candidate[1];
        var voteCount = candidate[2];

        // Render candidate Result
        var candidateTemplate = "<tr><th>" + id + "</th><td>" + name + "</td><td>" + voteCount + "</td></tr>"
        candidatesResults.append(candidateTemplate);

        // Render candidate ballot option
        var candidateOption = "<option value='" + id + "' >" + name + "</ option>"
        candidatesSelect.append(candidateOption);
      }

      const hasVoted = await electionInstance.voters(App.account);

      if (hasVoted) {
        $('form').hide();
      }
      loader.hide();
      content.show();
    } catch (error) {
      console.log(error);
    }
  },

  castVote: async function () {
    var candidateId = $('#candidatesSelect').val();

    try {
      const election = await App.contracts.Election.deployed()
      const result = await election.vote(candidateId, { from: App.account })
      $("#content").hide();
      $("#loader").show();
    } catch (error) {
      console.error(error)
    }
  }

};

$(function () {
  $(window).load(function () {
    App.init();
  });
});
