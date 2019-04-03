<template>
  <v-container fluid>
    <v-layout>

      <v-flex xs2>
      <v-navigation-drawer permanent>
        <v-toolbar flat>
          <v-list>
            <v-list-tile>
              <v-list-tile-title class="title">
                menu
              </v-list-tile-title>
            </v-list-tile>
          </v-list>
        </v-toolbar>

        <v-divider></v-divider>

        <v-list dense class="pt-0">
          <v-list-tile
            v-for="item in items"
            :key="item.title"
            :to="{path: item.url}"
          >
            <v-list-tile-action>
              <v-icon>{{ item.icon }}</v-icon>
            </v-list-tile-action>

            <v-list-tile-content>
              <v-list-tile-title>{{ item.title }}</v-list-tile-title>
            </v-list-tile-content>
          </v-list-tile>
        </v-list>
      </v-navigation-drawer>
      </v-flex>

      <v-flex xs10>
        <router-view></router-view>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>

export default {
  name: 'editor',
  computed: {
    env () {
      return process.env
    }
  },
  data () {
    return {
      items: [
        { title: 'edit', icon: 'dashboard', url: '/edit' },
        { title: 'next', icon: 'question_answer', url: '/edit/next' }
      ],
      nav: (event) => {
        console.log(event.target)
      }
    }
  }
}
</script>

<style></style>

