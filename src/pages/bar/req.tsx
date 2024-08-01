// import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
// import { Employee, SongType } from "@tipzy/shared";
// import { Text, SafeAreaView, Header, styles, paddingSpacing, Song, useThemeColor, Colors, DisplayOrLoading, radius, View as UIView } from "@tipzy/ui";
// import { Alert, FlatList, RefreshControl, Switch, TouchableOpacity } from "react-native";
// import { faCheck as YesIcon, faXmark as NoIcon, faUserAlt as UserIcon, faGear as SettingsIcon, faArrowAltCircleLeft, faArrowRotateRight } from '@fortawesome/free-solid-svg-icons'
// import { fetchWithToken, getAccount, getBusinessFromContext } from "../../RootLayout";
// import { useCallback, useContext, useEffect, useState } from "react";
// import { TabContext } from "../TabLayout";
// import useInterval from "packages/shared/src/lib/util";
// import RN, { View } from "react-native";
// import { useSafeAreaInsets } from "react-native-safe-area-context";
// import { RequestsProps } from "./RequestsTabLayout";

function e() { return <></> }

// type SongRequestType = {
//     user: { email: string, first_name: string, last_name: string },
//     id: number,
//     song: SongType,
//     price: number,
// }

// export default function Requests(props: RequestsProps) {
//     //current request ID
//     const deletedCheckAgain = 30000;
//     const [deletedIds, setDeletedIds] = useState<Map<number, number>>(new Map<number, number>());
//     // const deletedIds: number[] = [];
//     // const setDeletedIds = (d: number[]) => {}
//     // let crID: string | null = null;
//     // const setCrID = (s: string | null) => {crID = s};
//     const tc = useContext(TabContext);
//     const bu = tc.businessUser;
//     const business = getBusinessFromContext(tc);
//     const [ready, setReady] = useState(false);
//     const [requests, setRequests] = useState<SongRequestType[]>([]);
//     const [toggleRequests, setToggleRequests] = useState(business.allowing_requests ?? false); //change to get toggle requests
//     const [toggleAutoAccept, setToggleAutoAccept] = useState(business.auto_accept_requests ?? false);
//     const refreshRequestsTime = 5000;

//     const refreshToggles = async () => {
//         const u = await getAccount(bu).catch((e: Error) => console.log("Can't get acc in toggles", e.message));

//         // console.log("getAcount", u);
//         setToggleRequests(u.data.allowing_requests);
//     }

//     const setTakingRequests = async (b: boolean) => {
//         // const url = b ? 'business/' : 'business/disallow_requests/';
//         await fetchWithToken(tc, 'business/', "PATCH", JSON.stringify({
//             allowing_requests: b
//         })).then(response => response.json())
//             .then((json) => {
//                 console.log("finished", json.data.allowing_requests)
//                 if (json.status !== 200) throw new Error(json.details + json.error);
//             })
//             .catch((e: Error) => Alert.alert("Error:", `Can't ${b ? "take" : "disable taking"} requests: ` + e.message));
//         refreshToggles();
//     }

//     const addDeletedIds = (id: number) => {
//         const temp = deletedIds;
//         //add new id to deleted ids, never keep it above 50 to preserve space.
//         //if(temp.length >= 50) temp.shift();
//         temp.set(id, Date.now());
//         setDeletedIds(temp);
//     }

//     const rejectAll = () => {
//         const start = performance.now()
//         requests.forEach((r) => {
//             addDeletedIds(r.id);
//         })
//         // console.log(newRq);
//         setRequests([]);
//         console.log("Frontend Reject" + (performance.now() - start))
//         fetchWithToken(tc, `business/request/reject/all/`, "PATCH").then(response => {
//             if (!response) throw new Error("null response");
//             if (!response.ok) throw new Error("bad response: " + response.status);
//         }).then((json) => {
//             console.log("Reject Request" + (performance.now() - start))
//             // refreshRequests();
//         })
//             .catch((e: Error) => Alert.alert("Error rejecting request", e.message));

//     }

//     const onRejectAll = () => {
//         Alert.alert("Are you sure?", "You're about to reject all pending requests to your bar.",
//             [{
//                 text: 'Cancel',
//                 style: 'cancel',
//             },
//             {
//                 text: 'Reject All',
//                 onPress: rejectAll,
//                 style: 'destructive',
//             }]
//         )
//     }

//     const RenderItem = (props: { data: SongRequestType, id: number, index: number }) => {
//         const textColor = useThemeColor({}, "text");
//         // console.log("myID", props.data.reqID,"crID", crID)

//         const rejectOnPress = () => {
//             const start = performance.now()
//             addDeletedIds(props.data.id);
//             const newRq = [...requests];
//             newRq.splice(props.index, 1);
//             // console.log(newRq);
//             setRequests(newRq);
//             console.log("Frontend Reject" + (performance.now() - start))
//             fetchWithToken(tc, `business/request/reject/?request_id=${props.id}`, "PATCH").then(response => {
//                 if (!response) throw new Error("null response");
//                 if (!response.ok) throw new Error("bad response: " + response.status);
//             }).then((json) => {
//                 console.log("Reject Request" + (performance.now() - start))
//                 // refreshRequests();
//             })
//                 .catch((e: Error) => Alert.alert("Error rejecting request", e.message));
//         }

//         const acceptOnPress = () => {
//             // setRequests([]);
//             addDeletedIds(props.data.id);
//             const newRq = [...requests];
//             newRq.splice(props.index, 1);
//             // console.log(newRq);

//             setRequests(newRq);
//             fetchWithToken(tc, `business/request/accept/?request_id=${props.id}`, "PATCH").then(response => {
//                 console.log("response", response);
//                 if (!response) throw new Error("null response");
//                 if (!response.ok) throw new Error("bad response: " + response.status);
//                 return (response.json());
//             }).then((json) => {
//                 console.log("json", json);
//                 if (json.data != true) Alert.alert("Problem accepting song", `Status: ${json.status}. Data: ${json.detail} Error: ${json.error}`)
//                 // refreshRequests();
//             }
//             ).catch((e: Error) => Alert.alert("Error accepting request", e.message));
//         }

//         return (
//             <View key={`request ${props.id}`}>
//                 <RN.View style={{ padding: paddingSpacing, backgroundColor: props.index % 2 === 1 ? "#ffffff07" : undefined }}>
//                     <RN.View style={{ flexDirection: "row", justifyContent: "space-between", width: '100%', paddingBottom: 5 }}>
//                         <RN.View style={{ width: "75%" }}>
//                             <Song song={props.data.song} />
//                         </RN.View>
//                         <RN.View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: 'center', width: 90, height: "100%" }}>
//                             <TouchableOpacity onPress={rejectOnPress} style={{ width: 40, height: 40, borderRadius: 100, borderWidth: 1, borderColor: textColor, justifyContent: 'center', alignItems: 'center' }}>
//                                 <FontAwesomeIcon icon={NoIcon} color={textColor} size={20} ></FontAwesomeIcon>
//                             </TouchableOpacity>
//                             <TouchableOpacity onPress={acceptOnPress} style={{ width: 40, height: 40, borderRadius: 100, borderWidth: 1, borderColor: Colors.primaryRegular, justifyContent: 'center', alignItems: 'center' }}>
//                                 <FontAwesomeIcon icon={YesIcon} color={Colors.primaryRegular} size={20}></FontAwesomeIcon>
//                             </TouchableOpacity>
//                         </RN.View>
//                     </RN.View>
//                     <RN.View style={{ flexDirection: "row", alignItems: "center" }}>
//                         <Text style={{ paddingRight: 10, fontWeight: 'bold' }}>{`$${(props.data.price / 100).toFixed(2)}`}</Text>
//                         <FontAwesomeIcon icon={UserIcon} size={9} color={textColor} />
//                         <Text style={{ paddingLeft: 5 }}>{`${props.data.user.first_name} ${props.data.user.last_name}`}</Text>
//                     </RN.View>
//                 </RN.View>
//             </View>
//         );
//     }


//     useInterval(() => refreshRequests(), refreshRequestsTime);

//     const refreshAll = async () => {
//         await refreshRequests().catch((e) => console.log("Can't refresh all requests", e.message));
//         await refreshToggles().catch((e) => console.log("Can't refresh all toggles", e.message));
//         setReady(true)
//     }

//     useEffect(() => {
//         refreshAll().catch((e) => Alert.alert("Can't refresh all in requests", e.message));
//     }, []);

//     const acceptAllPressed = () => {
//         console.log("cleared")
//     };

//     const refreshRequests = async () => {
//         const r = await getRequests();
//         setRequests(r);
//     }


//     const getRequests = async (): Promise<SongRequestType[]> => {
//         const start = performance.now();
//         return fetchWithToken(tc, "business/requests/", "GET").then(response => {
//             // console.log("Refresh Request" + (performance.now() - start))
//             if (!response) throw new Error("null response");
//             if (!response.ok) throw new Error("Bad response " + response.status);
//             // console.log(response);
//             return response.json();
//         }).then(json => {
//             const out: SongRequestType[] = [];
//             json.data.forEach((item: any) => {
//                 const songJSON = item.song_json;
//                 const exptime = deletedIds.get(item.id);
//                 if (!exptime || exptime + deletedCheckAgain < Date.now()) {
//                     out.push({
//                         user: {
//                             first_name: item.tipper_info.tipper_info.first_name,
//                             last_name: item.tipper_info.tipper_info.last_name,
//                             email: item.tipper_info.tipper_info.email
//                         },
//                         id: item.id,
//                         song: { title: songJSON.name, artists: [songJSON.artist], albumart: songJSON.image_url, id: songJSON.id, explicit: songJSON.explicit ?? false },
//                         price: item.price,
//                     })
//                 }
//             });
//             // console.log("finished get")

//             // sendPushNotification(notifContext.expoPushToken, "hello", "it's me")

//             return out;
//         })
//             .catch((e: Error) => { console.log("error: " + e.message); return [] })
//     }
//     // const [refreshing, setRefreshing] = useState(false);
//     const [refreshingIndicator, setRefreshingIndicator] = useState(false);

//     const onRefresh = useCallback(() => {
//         if (refreshingIndicator) return;
//         setDeletedIds(new Map<number, number>());
//         // setRefreshing(true);
//         setRefreshingIndicator(true);
//         refreshRequests().then(() => setRefreshingIndicator(false))
//     }, []);

//     return (
//         <UIView style={{ flex: 1 }}>
//             <DisplayOrLoading condition={ready}>
//                 <View style={[styles.container, { padding: 0 }]}>
//                     <View style={{ paddingTop: useSafeAreaInsets().top }}>
//                         <Header title={"Requests"} //rightOnPress={acceptAllPressed} rightText="Accept all" rightPaddingHorizontal={paddingSpacing}
//                             extraBottomPadding
//                             // leftOnPress={() => refreshRequests()} leftText="Refresh" leftPaddingHorizontal={paddingSpacing}
//                             rightOnPress={() => props.navigation.navigate("Settings", { account: bu })}
//                             rightCustomComponent={
//                                 <View style={{ alignItems: "flex-end", justifyContent: 'center', paddingRight: paddingSpacing }}><FontAwesomeIcon icon={SettingsIcon} size={20} color="white" /></View>
//                             }
//                         />
//                     </View>
//                     {/* <View style={{ flexDirection: 'row-reverse', justifyContent: 'flex-end', width: "100%", padding: paddingSpacing, paddingTop: 0 }}>
//                         <TouchableOpacity style={{ padding: paddingSpacing / 2, borderRadius: radius, backgroundColor: Colors.red, flexDirection: 'row' }} onPress={onRejectAll}>
//                             <FontAwesomeIcon icon={NoIcon} color={"white"} size={20} ></FontAwesomeIcon>
//                             <Text style={{ color: "white", fontWeight: 'bold' }}>Reject All</Text>
//                         </TouchableOpacity>
//                     </View> */}
//                     <View style={{ width: "100%", flex: 1, backgroundColor: "#0002" }}>
//                         <FlatList data={requests}
//                             keyExtractor={(item, index) => "id" + (item.id * index)}
//                             renderItem={data => <RenderItem data={data.item} id={data.item.id} index={data.index} />}
//                             ListEmptyComponent={
//                                 <View style={{ width: "100%", justifyContent: 'center', opacity: 0.7, padding: paddingSpacing }}>
//                                     <Text style={{ width: "100%", textAlign: 'center' }}>No pending requests at the moment.</Text>
//                                     <Text style={{ width: "100%", textAlign: 'center' }}>(Pull down to refresh)</Text>
//                                 </View>}
//                             refreshControl={
//                                 <RefreshControl refreshing={refreshingIndicator} onRefresh={onRefresh} tintColor={Colors.refresh} />
//                             }
//                         />
//                     </View>
//                     <View style={{ flexShrink: 1, flexDirection: 'row', justifyContent: 'space-between', width: "100%", padding: paddingSpacing }}>
//                         <TouchableOpacity style={{ padding: paddingSpacing / 2, borderRadius: radius, backgroundColor: Colors.red, flexDirection: 'row' }} onPress={onRejectAll}>
//                             <FontAwesomeIcon icon={NoIcon} color={"white"} size={20} ></FontAwesomeIcon>
//                             <Text style={{ color: "white", fontWeight: 'bold' }}>Reject All</Text>
//                         </TouchableOpacity>
//                         <View style={{ flexShrink: 1, flexDirection: 'row', alignItems: 'center', }}>
//                             <Text> Taking requests </Text>
//                             <Switch trackColor={{ false: undefined, true: Colors.primaryRegular }} value={toggleRequests} onValueChange={(e) => setTakingRequests(e.valueOf())} />
//                         </View>
//                         {/* <View style={{ paddingLeft: paddingSpacing }}></View>
//                             <TouchableOpacity style={{ padding: paddingSpacing / 2, borderRadius: radius, borderColor: Colors.primaryRegular, borderWidth: 1, flexDirection: 'row' }}>
//                                 <FontAwesomeIcon icon={YesIcon} color={Colors.primaryRegular} size={20} ></FontAwesomeIcon>
//                                 <Text style={{ fontWeight: 'bold', color: Colors.primaryRegular }}> All</Text>
//                             </TouchableOpacity> */}
//                     </View>
//                 </View>
//             </DisplayOrLoading>
//         </UIView>
//     )
// }