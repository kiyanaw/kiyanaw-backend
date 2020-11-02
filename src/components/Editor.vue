<template>
  <v-container fluid>
    <v-layout>
      <v-flex xs2>
        <v-navigation-drawer permanent>
          <v-toolbar flat>
            <v-list>
              <v-list-tile>
                <v-list-tile-title class="title">
                  morphemes
                </v-list-tile-title>
              </v-list-tile>
            </v-list>
          </v-toolbar>

          <v-divider />

          <v-list
            dense
            class="pt-0"
          >
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
        <router-view />
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>

export default {
  name: 'Editor',
  data () {
    return {
      items: [
        { title: 'Morphemes', icon: 'widgets', url: '/edit/morphemes' },
        { title: 'All words', icon: 'list', url: '/all' },
        { title: 'Pending', icon: 'search', url: '/edit' },
        { title: 'Skipped', icon: 'outlined_flag', url: '/skipped' },
        { title: 'Starred', icon: 'star', url: '/skipped' },
        { title: 'Next unverified', icon: 'create', url: '/next-unverified' }
      ],
      nav: (event) => {
        console.log(event.target)
      }
    }
  },
  computed: {
    env () {
      return process.env
    }
  }
}
</script>

<style></style>

