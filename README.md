# Social-Blacklist
A reddit mod tool to automatically remove posts by users who have social links belonging to certain domains. This would be helpful to communities where spamming is common by users with goal to attract to visitors to their social-links for commercial gain(like platforms for selling content, or get PPV etc.). After installing the app, go to App Settings and configure the domains and removal message as per your requirement. To know if the app is removing the posts accordingly, you can check your mod-log for actions made by /u/social-blacklist.

### Installing the app:
Moderators can install the app to their subreddit by going to [https://developers.reddit.com/apps/social-blacklist](https://developers.reddit.com/apps/social-blacklist)

### App Settings
The settings page provides the following settings:
  1) Blacklisted-Domains: A list of domains to blacklist (For example: instagram.com, youtube.com)
  2) Removal message: Text that would be sent to the user on removal of the post.

You can access these settings by going to https://developers.reddit.com/r/[subreddit-name]/apps/social-blacklist

## Changelog
* 0.0.2
    * Initial version with domains input in settings, and trigger on PostSubmit to read social links of user and remove on matching the blacklisted domains.