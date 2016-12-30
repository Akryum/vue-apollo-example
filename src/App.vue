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
    <form @submit.prevent="addTag">
      <input v-model="newTag" placeholder="New tag" autocomplete="off" />
    </form>

    <h2>Pagination</h2>
    <div class="tag-list" v-if="tagsPage">
      <div class="tag-list-item" v-for="tag in tagsPage.tags">
        {{ tag.id }} - {{ tag.label }} - {{ tag.type }}
      </div>
      <div class="actions">
        <button v-if="showMoreEnabled" @click="showMore">Show more</button>
      </div>
    </div>
  </div>
</template>

<script>
import gql from 'graphql-tag';

const pageSize = 10;

export default {
  name: 'app',
  data: () => ({
    newTag: null,
    updateCount: 0,
    type: 'City',
    skipQuery: false,
    tagsLoading: 0,
    showTag: 'random',
    // Optional properties init
    tags: [],
    randomTag: null,
    page: 0,
    showMoreEnabled: true,
  }),
  apollo: {
    // 'tags' data property on vue instance
    tags () {
      console.log(this.type)
      return {
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
            lastTag {
              id
              label
              type
            }
          }`
        }
      },
      update: data => data.randomTag || data.lastTag,
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
    },

    // Subscriptions
    subscribe: {
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
          console.log(data);
          this.tags.push(data.tagAdded);
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
          tagList: (previousQueryResult, { mutationResult }) => {
            // We incorporate any received result (either optimistic or real)
            // into the 'tagList' query we set up earlier
            return {
              tags: [...previousQueryResult.tags, mutationResult.data.addTag],
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
        updateQuery: (previousResult, { fetchMoreResult }) => {
          const newTags = fetchMoreResult.data.tagsPage.tags;
          const hasMore = fetchMoreResult.data.tagsPage.hasMore;

          this.showMoreEnabled = hasMore;

          return {
            tagsPage: {
              tags: [...previousResult.tagsPage.tags, ...newTags],
              hasMore,
            },
          };
        },
      });
    },
  },
  mounted() {
    const subQuery = gql`subscription tags($type: String!) {
      tagAdded(type: $type) {
        id
        label
        type
      }
    }`;
    const observer = this.$apollo.subscribe({
      query: subQuery,
      variables: {
        type: 'City',
      },
    });

    observer.subscribe({
      next(data) {
        console.log(data);
      },
    });
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
