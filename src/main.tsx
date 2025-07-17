import { Devvit, JobContext, Post, SettingScope, TriggerContext} from '@devvit/public-api';
import * as protos from "@devvit/protos";
import { UserAboutResponse } from "@devvit/protos/types/devvit/plugin/redditapi/users/users_msg.js";
import { PostV2 } from '@devvit/protos/types/devvit/reddit/v2alpha/postv2.js';

Devvit.configure({redditAPI: true, 
                  redis: true,
                  userActions: false });

enum removalReasons {
  none = "None",
  blacklistedDomainInSocialLinks = "Blacklisted domain found in user's Social Links",
  blacklistedDomainInStickyPost = "Blacklisteddomain found in user's Sticky post",
  blacklistedDomainInPostLink = "Blacklisteddomain found in post link",
  blacklistedDomainInPostBody = "Blacklisteddomain found in post body/content",
  blacklistedDomainInRecentComments= "Blacklisted domain found in user's Recent comments",
  blacklistedDomainInComment = "Blacklisted domain found in user's comment",
  NSFWProfile = "NSFW Profile",
}

Devvit.addTrigger({
  event:'AppInstall',
  onEvent: async (event, context) => {
    await addScheduledJob(context);
  },
});

Devvit.addTrigger({
  event:'AppUpgrade',
  onEvent: async (event, context) => {
    await addScheduledJob(context);
  },
});

async function addScheduledJob(context:TriggerContext) {  
  const oldJobId = (await context.redis.get('ScheduledJobId')) || '0';
  const scheduledJobs = await context.scheduler.listJobs();

  for( const key in scheduledJobs ){
    if ( scheduledJobs[key].id == oldJobId) {
      await context.scheduler.cancelJob(oldJobId);
    }
  }
  console.log("Adding a new scheduled job for scheduled feed checking.");
  const jobId = await context.scheduler.runJob({
  name: 'check-feeds',
  //cron: '* * * * *', //Runs every minute - Only use this for testing.
  cron: '*/10 * * * *', //Runs 10 mins once.
  });
  await context.redis.set('ScheduledJobId', jobId);
}

Devvit.addSchedulerJob({
  name: 'check-feeds',  
  onRun: async(event, context) => {
    const subreddit = await context.reddit.getCurrentSubreddit();
    const posts = await context.reddit
      .getNewPosts({
        subredditName: subreddit.name,
        limit: 30,
        pageSize: 1,
      })
      .all();

    const settings = await context.settings.getAll();
    const blacklisted_list = settings['blacklisted-domains']??'';
    const removeDomainInSocialLinks = settings['removeDomainInSocialLinks'];

    if( removeDomainInSocialLinks && typeof blacklisted_list== "string" ){

      for( var i=0; i< posts.length; i++ ) {
        const author = await context.reddit.getUserByUsername(posts[i].authorName);        
        if( author ) {
          const socialLinks = await author.getSocialLinks();
          const blacklisted_domains = blacklisted_list
          .split(',')
          .map((d) => d.trim().toLowerCase())
          .filter(Boolean);
          // Check if any social link matches a blacklisted domain
          const blacklistedDomainFoundInSocialLinks = socialLinks?.some(link =>
            blacklisted_domains.some(domain => link.outboundUrl.toLowerCase().includes(domain))
          );

          if( blacklistedDomainFoundInSocialLinks ) {
            await removePost(posts[i], removalReasons.blacklistedDomainInSocialLinks, context);
          }
        }
      }
    }
  },
});

export interface RedditAPIPlugins {
    NewModmail: protos.NewModmail;
    Widgets: protos.Widgets;
    ModNote: protos.ModNote;
    LinksAndComments: protos.LinksAndComments;
    Moderation: protos.Moderation;
    GraphQL: protos.GraphQL;
    Listings: protos.Listings;
    Flair: protos.Flair;
    Wiki: protos.Wiki;
    Users: protos.Users;
    PrivateMessages: protos.PrivateMessages;
    Subreddits: protos.Subreddits;
}

export type ExtendedDevvit = typeof Devvit & {
    redditAPIPlugins: RedditAPIPlugins;
};

export function getExtendedDevvit (): ExtendedDevvit {
    return Devvit as ExtendedDevvit; // The Devvit object already has the extended properties, they are simply not reflected in the public type definition.
}

async function getRawUserData (username: string, metadata: protos.Metadata): Promise<UserAboutResponse | undefined> {
    try {
        return await getExtendedDevvit().redditAPIPlugins.Users.UserAbout({ username }, metadata);
    } catch {
        return undefined;
    }
}

Devvit.addSettings([
  {
    type: 'string',
    name: 'blacklisted-domains',
    label: 'Blacklisted Domains (comma-separated):',
    scope: SettingScope.Installation,
    helpText: "Provide a list of black-listed domains - For example: instagram.com, youtube.com",
    onValidate: ({ value }) => {
      // Split the input and trim whitespace
      if (typeof value == "string") {
        if( value.length == 0 ) {
          return "This field is required";
        }
        const domains = value.split(',').map((d) => d.trim());
        // Simple validation: check if each domain matches a basic pattern
        const domainPattern = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        for (const domain of domains) {
          if (!domainPattern.test(domain)) {
            return `Invalid domain: ${domain}`;
          }
        }
      }
    }
  },
  {
    type: 'string',
    name: 'removal-message',
    label: 'Message to user on removal of the post:',
    defaultValue: "Your submission has been removed from this sub based on your profile information or posted content. Please review rules of the sub for further information on what is allowed/disallowed on this subreddit.",
    scope: SettingScope.Installation,
  },
  {
    type: 'boolean',
    name: 'removeDomainInSocialLinks',
    label: 'Remove posts from users who have blacklisted domains in `Social Links` section of their profile.',
    scope: SettingScope.Installation, 
    defaultValue: true,
  }, 
  {
    type: 'boolean',
    name: 'removeDomainInPostLink',
    label: 'Remove posts containing blacklisted domains in post link',
    scope: SettingScope.Installation, 
    defaultValue: false,
  },
  {
    type: 'boolean',
    name: 'removeDomainInPostBody',
    label: 'Remove posts containing blacklisted domains in post body/content.',
    scope: SettingScope.Installation, 
    defaultValue: false,
  },
  {
    type: 'boolean',
    name: 'removeDomainInComment',
    label: 'Remove comments containing blacklisted domains.',
    scope: SettingScope.Installation, 
    defaultValue: false,
  },
  {
    type: 'boolean',
    name: 'notifyModeratorsOnRemoval',
    label: 'Notify moderators on removals through mod-mail.',
    scope: SettingScope.Installation, 
    defaultValue: false
  },
  {
    type: 'boolean',
    name: 'removeNSFWProfilePosts',
    label: 'Remove all posts made by users having NSFW profiles(irrespective of content or Social Links).',
    scope: SettingScope.Installation, 
    defaultValue: false,
  },
  {
    type: 'boolean',
    name: 'ignoreModerators',
    label: 'Ignore posts and comments by moderators of this subreddit.',
    scope: SettingScope.Installation, 
    defaultValue: true,
  },
/*  {
    type: 'number',
    name: 'max-removals',
    label: 'Number of removals after which the user would be banned',
    scope: SettingScope.Installation,
    defaultValue: 3
  }
  */
]);

Devvit.addTrigger({
  event: 'PostSubmit',
  onEvent: async (event, context) => {

    const settings = await context.settings.getAll();
    const blacklisted_list = settings['blacklisted-domains'];
    const removeDomainInSocialLinks = settings['removeDomainInSocialLinks'];
    const removeNSFWProfilePosts = settings['removeNSFWProfilePosts'];
    const removeDomainInPostLink = settings['removeDomainInPostLink'];
    const removeDomainInPostBody = settings['removeDomainInPostBody'];
    var removalReason:removalReasons = removalReasons.none;
    const author = await context.reddit.getUserById(event.post?.authorId??"defaultUsernameXXX");
    var authorUsername = author?.username??"nobody";

    if( blacklisted_list && typeof blacklisted_list== "string" && author ) {

      const blacklisted_domains =blacklisted_list
      .split(',')
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);
  
      if( event.post!= undefined ) {

        const socialLinks = await author.getSocialLinks();

        // Check if any social link matches a blacklisted domain
        const blacklistedDomainFoundInSocialLinks = socialLinks?.some(link =>
          blacklisted_domains.some(domain => link.outboundUrl.toLowerCase().includes(domain))
        );

        const blacklistedDomainFoundInPostLink = blacklisted_domains.some(domain => event.post?.url.toLowerCase().includes(domain))
        const blacklistedDomainFoundInPostBody = blacklisted_domains.some(domain => event.post?.selftext.toLowerCase().includes(domain))

        const rawUserData = await getRawUserData(authorUsername, context.debug.metadata);

        if (removeDomainInSocialLinks && blacklistedDomainFoundInSocialLinks) {
          removalReason = removalReasons.blacklistedDomainInSocialLinks;
        }
        else if( removeDomainInPostLink && blacklistedDomainFoundInPostLink ){
          removalReason = removalReasons.blacklistedDomainInPostLink;
        }
        else if( removeDomainInPostBody && blacklistedDomainFoundInPostBody ){
          removalReason = removalReasons.blacklistedDomainInPostBody;
        }
        else if ( removeNSFWProfilePosts && rawUserData?.data && rawUserData.data.subreddit?.over18) {
          removalReason = removalReasons.NSFWProfile;
        }

        if( removalReason != removalReasons.none ) {
          await removePost(event.post, removalReason, context);
        }
      }
    }
  },
});

async function removePost(posToRemove:PostV2 | Post,  removalReason:removalReasons, context: TriggerContext | JobContext) {
  const settings = await context.settings.getAll();
  const removal_message = settings['removal-message'];  
  const notifyModeratorsOnRemoval = settings['notifyModeratorsOnRemoval'];
  const author = await context.reddit.getUserById(posToRemove.authorId??"defaultUsernameXXX");
  const ignoreModerators = settings['ignoreModerators'];
  const subreddit = await context.reddit.getCurrentSubreddit();

  if( ignoreModerators ) {
    const moderators = await subreddit.getModerators().all();
    for (const mod of  moderators) {
      if (mod.username === author?.username) {
        return;//Do not action anything if the user is a moderator.
      }
    }
  }

  const redditComment = await context.reddit.submitComment({
    id: posToRemove.id,
    text: `${removal_message}`,
  });

  await redditComment.distinguish(true);

  await context.reddit.sendPrivateMessage({
    to: author?.username??"defaultUsernameXXX",
    subject: `Your post '${posToRemove.title}' has been removed from ${context.subredditName}`,
    text: `${removal_message} \n\n Post link: ${posToRemove.permalink}`,
  });

  const post =await context.reddit.getPostById(posToRemove.id);
  await post.remove();

  if( notifyModeratorsOnRemoval ) {
    const conversationId = await context.reddit.modMail.createModNotification({  
      subject: 'post removal from Social-Blacklist',
      bodyMarkdown: 'A post has been removed by Social-Blacklist. \n\n Author: https://www.reddit.com/u/'+author?.username+'  \n\n Post title: '+post.title+' \n\n Post link: '+post.permalink+'  \n\n Removal reason: '+removalReason,
      subredditId: context.subredditId,
    });
  }
}

Devvit.addTrigger({
  event: 'CommentCreate',
  onEvent: async (event, context) => {
    const blacklisted_domains_list = await context.settings.get('blacklisted-domains');
    const ignoreModerators = await context.settings.get('ignoreModerators');
    const notifyModeratorsOnRemoval = await context.settings.get('notifyModeratorsOnRemoval');
    const removeDomainInComment = await context.settings.get('removeDomainInComment');
    const removal_message = await context.settings.get('removal-message');
    const subreddit = await context.reddit.getCurrentSubreddit();    
    const authorUsername = event.author?.name??"defaultUserName";

    if( removeDomainInComment && typeof blacklisted_domains_list == "string" ) {

      if( ignoreModerators ) {
        const moderators = await subreddit.getModerators().all();
        for (const mod of  moderators) {
          if (mod.username === authorUsername) {
            return;//Do not action anything if the user is a moderator.
          }
        }
      }

      const blacklisted_domains = blacklisted_domains_list
      .split(',')
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);

      const commentBody = event.comment?.body ?? '';
      const foundDomain = blacklisted_domains.find(domain => commentBody.toLowerCase().includes(domain));
      if ( foundDomain && event.comment?.id ) {
        await context.reddit.remove(event.comment.id, false);//TODO: Make spam=true later if needed.

        await context.reddit.sendPrivateMessage({
            to: authorUsername,
            subject: `Your comment has been removed from /r/${subreddit.name}`,
            text: `${removal_message} \n\n Comment link: ${event.comment?.permalink}`,
        });

        if( notifyModeratorsOnRemoval ) {
          const conversationId = await context.reddit.modMail.createModNotification({  
            subject: 'comment removal from Social-Blacklist',
            bodyMarkdown: 'A comment has been removed by Social-Blacklist. \n\n Author: https://www.reddit.com/u/'+ authorUsername+'  \n\n Comment text: '+event.comment?.body+' \n\n Comment link: '+event.comment?.permalink+'  \n\n Removal reason: '+removalReasons.blacklistedDomainInComment,
            subredditId: context.subredditId,
          });
        }
      }
    }
  },
});

export default Devvit;
