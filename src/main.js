import Vue from 'vue'

import 'isomorphic-fetch'

import { ApolloClient, createNetworkInterface } from 'apollo-client'
import { SubscriptionClient, addGraphQLSubscriptions } from 'subscriptions-transport-ws'

const networkInterface = createNetworkInterface({
  uri: 'http://localhost:3020/graphql',
  transportBatching: true,
})

const wsClient = new SubscriptionClient('ws://localhost:3020/subscriptions', {
  reconnect: true,
})

const networkInterfaceWithSubscriptions = addGraphQLSubscriptions(
  networkInterface,
  wsClient,
)

const apolloClient = new ApolloClient({
  networkInterface: networkInterfaceWithSubscriptions,
  ssrForceFetchDelay: 100,
  connectToDevTools: true,
})

import VueApollo from 'vue-apollo'
Vue.use(VueApollo, {
  apolloClient,
})

import App from './App.vue'

new Vue({
  el: '#app',
  render: h => h(App),
})
