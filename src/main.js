import Vue from 'vue'
import App from './App.vue'
import ApolloClient, { createNetworkInterface } from 'apollo-client';
import { Client } from 'subscriptions-transport-ws';
import VueApollo, { addGraphQLSubscriptions } from 'vue-apollo';

const networkInterface = createNetworkInterface({
  uri: 'http://localhost:3000/graphql',
  transportBatching: true,
});

const wsClient = new Client('ws://localhost:3030');

const networkInterfaceWithSubscriptions = addGraphQLSubscriptions(
  networkInterface,
  wsClient,
);

const apolloClient = new ApolloClient({
  networkInterface: networkInterfaceWithSubscriptions,
});

Vue.use(VueApollo, {
  apolloClient,
});

new Vue({
  el: '#app',
  render: h => h(App)
});
