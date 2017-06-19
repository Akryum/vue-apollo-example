<template>
  <div id="app">
    <div class="logo">
      <img src="./assets/logo.png">
    </div>
    <h1>Vue Apollo Integration</h1>

    <div class="tag-of-the-day" v-if="randomTag">
      <h2>Tag of the day</h2>
      <div class="type">
        <label>
          <input type="radio" value="random" v-model="showTag" />
          Random tag
        </label>
        <label>
          <input type="radio" value="last" v-model="showTag" />
          Last tag
        </label>
      </div>
      <div class="tag">
        {{ randomTag.label }} - {{ randomTag.type }}
      </div>
    </div>

    <h2>Tags</h2>
    <div class="info">
      <label><input type="checkbox" v-model="skipQuery" /> Skip query (this disables the apollo query)</label>
    </div>
    <div class="info">
      Query updates: {{ updateCount }}
    </div>
    <div class="type">
      <label>
        <input type="radio" value="City" v-model="type" />
        Cities
      </label>
      <label>
        <input type="radio" value="Company" v-model="type" />
        Companies
      </label>
    </div>
    <div class="tags">
      <div v-for="tag in tags" :class="['tag',{optimistic: tag.id === -1}]" :title="tag.id">
        {{tag.label}}
      </div>
    </div>
    <div class="loading" v-if="tagsLoading">
      <img src="./assets/loader.gif" /> Loading tags...
    </div>
    <div>
      <button @click="refetchTags">Refetch</button>
    </div>
    <form @submit.prevent="addTag">
      <input v-model="newTag" placeholder="New tag" autocomplete="off" />
    </form>

    <h2>Pagination</h2>
    <div class="tag-list">
      <template v-if="tagsPage">
        <div class="tag-list-item" v-for="tag in tagsPage.tags">
          {{ tag.id }} - {{ tag.label }} - {{ tag.type }}
        </div>
      </template>
      <div class="loading" v-if="tagsPageLoading">
        <img src="./assets/loader.gif" /> Loading paginated tags...
      </div>
      <div class="actions" v-else>
        <button v-if="showMoreEnabled" @click="showMore">Show more</button>
      </div>
    </div>
  </div>
</template>

<script>
import gql from 'graphql-tag';

const pageSize = 10;


const SUB_QUERY = gql`subscription tags($type: String!) {
  tagAdded(type: $type) {
    id
    label
    type
  }
}`;

export default {
  name: 'app',
  data () {
    return {
      newTag: null,
      updateCount: 0,
      type: 'City',
      skipQuery: false,
      tagsLoading: 0,
      tagsPageLoading: 0,
      showTag: 'random',
      showMoreEnabled: true,
      page: 0,
      // Optional properties init
      /* tags: [],
      randomTag: null, */
    }
  },
  apollo: {
    $client: 'a',
    // 'tags' data property on vue instance
    tags () {
      console.log(this.type)
      return {
        // client: 'a',
        // GraphQL Query
        query: gql`query tagList ($type: String!) {
          tags(type: $type) {
            id
            label
          }
        }`,
        // Reactive variables
        variables() {
          return {
            type: this.type,
          };
        },
        // Polling
        // pollInterval: 300, // ms
        // Hook example
        result() {
          this.updateCount ++;
        },
        // Disable the query
        skip() {
          return this.skipQuery
        },
        // Loading key
        loadingKey: 'tagsLoading',

        fetchPolicy: 'cache-and-network',

        subscribeToMore: {
          document: SUB_QUERY,
          variables () {
            return {
              type: this.type,
            }
          },
          // Mutate the previous result
          updateQuery: (previousResult, { subscriptionData }) => {
            // If we added the tag already don't do anything
            // This can be caused by the `updateQuery` of our addTag mutation
            if (previousResult.tags.find(tag => tag.id === subscriptionData.data.tagAdded.id)) {
              return previousResult
            }

            return {
              tags: [
                ...previousResult.tags,
                // Add the new tag
                subscriptionData.data.tagAdded,
              ],
            }
          },
        },
      }
    },

    // Random tag
    randomTag: {
      query () {
        if (this.showTag === 'random') {
          return gql`{
            randomTag {
              id
              label
              type
            }
          }`
        } else if (this.showTag === 'last') {
          return gql`{
            randomTag: lastTag {
              id
              label
              type
            }
          }`
        }
      },
      // update: data => data.randomTag || data.lastTag,
    },

    // Pages
    tagsPage: {
      // GraphQL Query
      query: gql`query tagsPage ($page: Int!, $pageSize: Int!) {
        tagsPage(page: $page, size: $pageSize) {
          tags {
            id
            label
            type
          }
          hasMore
        }
      }`,
      variables: {
        page: 0,
        pageSize,
      },
      loadingKey: 'tagsPageLoading',
    },

    // "Notify me" Subscriptions
    $subscribe: {
      tags: {
        query: gql`subscription tags($type: String!) {
          tagAdded(type: $type) {
            id
            label
            type
          }
        }`,
        // Reactive variables
        variables() {
          return {
            type: this.type,
          };
        },
        // Result hook
        result(data) {
          console.log('$subscribe option', data);
        },
        // Disable the subscription
        skip() {
          return this.skipQuery
        },
      },
    },
  },
  methods: {
    addTag() {
      // We save the user input in case of an error
      const newTag = this.newTag;
      // We clear it early to give the UI a snappy feel
      this.newTag = '';
      // Call to the graphql mutation
      this.$apollo.mutate({
        // Query
        mutation: gql`mutation ($type: String!, $label: String!) {
          addTag(type: $type, label: $label) {
            id
            label
          }
        }`,
        // Parameters
        variables: {
          type: this.type,
          label: newTag,
        },
        // Update the cache with the result
        // 'tagList' is the name of the query declared before
        // that will be updated with the optimistic response
        // and the result of the mutation
        updateQueries: {
          tagList: (previousResult, { mutationResult }) => {
            // If we added the tag already don't do anything
            // This can be caused by the `updateQuery` of our subscribeToMore
            if (previousResult.tags.find(tag => tag.id === mutationResult.data.addTag.id)) {
              return previousResult
            }

            // We incorporate any received result (either optimistic or real)
            // into the 'tagList' query we set up earlier
            return {
              tags: [
                ...previousResult.tags,
                mutationResult.data.addTag
              ],
            };
          },
        },
        // Optimistic UI
        // Will be treated as a 'fake' result as soon as the request is made
        // so that the UI can react quickly and the user be happy
        optimisticResponse: {
          __typename: 'Mutation',
          addTag: {
            __typename: 'Tag',
            id: -1,
            label: newTag,
            type: this.type,
          },
        },
      }).then((data) => {
        // Result
        console.log(data);
      }).catch((error) => {
        // Error
        console.error(error);
        // We restore the initial user input
        this.newTag = newTag;
      });
    },

    showMore() {
      this.page ++;
      this.$apollo.queries.tagsPage.fetchMore({
        variables: {
          page: this.page,
          pageSize,
        },
        // Mutate the previous result
        updateQuery: (previousResult, { fetchMoreResult }) => {
          const newTags = fetchMoreResult.tagsPage.tags;
          const hasMore = fetchMoreResult.tagsPage.hasMore;

          this.showMoreEnabled = hasMore;

          return {
            tagsPage: {
              tags: [
                ...previousResult.tagsPage.tags,
                // Add the new tags
                ...newTags,
              ],
              hasMore,
            },
          };
        },
      });
    },

    refetchTags () {
      this.$apollo.queries.tags.refetch()
    },
  },
  mounted() {
    // Programmatic subscription
    const observer = this.$apollo.subscribe({
      query: SUB_QUERY,
      variables: {
        type: 'Companies',
      },
    });
    observer.subscribe({
      next(data) {
        console.log('this.$apollo.subscribe', data);
      },
    });

    // SubscribeToMore tags
    /* this.$watch(() => this.type, (type, oldType) => {
      if (type !== oldType || !this.tagsSub) {
        // We need to unsubscribe before re-subscribing
        if (this.tagsSub) {
          this.tagsSub.unsubscribe()
        }
        // Subscribe
        this.tagsSub = this.$apollo.queries.tags.subscribeToMore({
          document: SUB_QUERY,
          variables: {
            type,
          },
          // Mutate the previous result
          updateQuery: (previousResult, { subscriptionData }) => {
            // If we added the tag already don't do anything
            // This can be caused by the `updateQuery` of our addTag mutation
            if (previousResult.tags.find(tag => tag.id === subscriptionData.data.tagAdded.id)) {
              return previousResult
            }

            return {
              tags: [
                ...previousResult.tags,
                // Add the new tag
                subscriptionData.data.tagAdded,
              ],
            }
          },
        })
      }
    }, {
      immediate: true,
    }) */

  },
};
</script>

<style>
body, input {
  font-family: Helvetica, sans-serif;
  font-size: 12pt;
}

#app {
  max-width: 500px;
  padding: 12px;
  margin: auto;
  text-align: center;
}

.info,
.loading {
  color: #999;
  margin: 12px;
}

.tag {
  display: inline-block;
  padding: 4px;
  background: #40b883;
  color: white;
  border-radius: 2px;
  margin: 2px;
}

.tag.optimistic {
  background: #b76c40;
}

form {
  margin: 22px;
}

input {
  padding: 8px;
  border: solid 1px #bbb;
  border-radius: 2px;
}

input:focus {
  box-shadow: none;
  outline: none;
  border-color: #40b883;
}

.tag-list {
  text-align: left;
  border: solid 1px #40b883;
  padding: 10px;
  border-radius: 3px;
}

.actions {
  text-align: center;
}
</style>
