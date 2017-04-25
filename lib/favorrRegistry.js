'use strict';

// onAdTransaction
function onAdTransaction(transaction) {

  var userRegistry = null;
  var personRegistry = null;

  // default point is 1
  var add_favorr = 1;
  var transactionType = 'impression';
  if (transaction.transactionType) {
    transactionType = transaction.transactionType;
  }

  return getParticipantRegistry('io.favorr.adnetwork.User')
  .then(function(result) {

    userRegistry = result;

    var advertiser_id = transaction.advertiser['$identifier'];
    if (transactionType == 'impression'){
      if (transaction.user.impression_app && transaction.user.impression_app.indexOf(advertiser_id) != -1) {
        // throw new Error('this user is already counted on this app impression');
        return Promise.reject('this user is already counted on this app impression');
      }

      // update
      transaction.user.impression_count++;
      if (!transaction.user.impression_app) {
        transaction.user.impression_app = [advertiser_id];
      } else {
        transaction.user.impression_app.push(advertiser_id);
      }
      return userRegistry.update(transaction.user);

    } else if (transactionType == 'click'){
      // default click point is 2.
      // but it could be much higher if model has fraud prevention.
      add_favorr = 2

      if (transaction.user.click_app && transaction.user.click_app.indexOf(advertiser_id) != -1 ) {
        // throw new Error('this user is already counted on this app click');
        return Promise.reject('this user is already counted on this app click');
      }

      // update
      transaction.user.click_count++;
      if (!transaction.user.click_app) {
        transaction.user.click_app = [advertiser_id];
      } else {
        transaction.user.click_app.push(advertiser_id);
      }

      // last_clicked_agreement_id
      transaction.user.last_clicked_agreement_id = transaction.agreement['$identifier'];
      transaction.last_clickedAt = new Date();

      return userRegistry.update(transaction.user);


    } else if (transactionType == 'install') {
      // default install point is 10 but it could be much higher if model has fraud prevention system
      add_favorr = 10

      if (transaction.user.install_app && transaction.user.install_app.indexOf(advertiser_id) != -1) {
        // throw new Error('this user is already counted on this app install');
        return Promise.reject('this user is already counted on this app install');
      }

      // update
      transaction.user.install_count++;
      if (!transaction.user.install_app) {
        transaction.user.install_app = [advertiser_id];
      } else {
        transaction.user.install_app.push(advertiser_id);
      }
      return userRegistry.update(transaction.user);
    }

  })
  .then(function() {
    return getParticipantRegistry('io.favorr.adnetwork.Person')
  })
  .then(function(result) {
    transaction.publisher.owner.favorr = transaction.publisher.owner.favorr + add_favorr;
    transaction.advertiser.owner.favorr = transaction.advertiser.owner.favorr - add_favorr;
    return result.updateAll([transaction.advertiser.owner, transaction.publisher.owner]);
  })
  .then(function() {
    return getParticipantRegistry('io.favorr.adnetwork.App')
  })
  .then(function(result) {

    if (transactionType == 'impression'){
      transaction.publisher.impressions_sent++;
      transaction.advertiser.impressions_recv++;
    } else if (transactionType == 'impression') {
      transaction.publisher.clicks_sent++;
      transaction.advertiser.clicks_recv++;
    } else if (transactionType == 'install') {
      transaction.publisher.installs_sent++;
      transaction.advertiser.installs_recv++;
    }

    return result.updateAll([transaction.advertiser, transaction.publisher]);
  })
  .catch(function (error) {
    // throw new Error(error);
    return Promise.reject(error);
  });
}
